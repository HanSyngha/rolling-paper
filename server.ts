import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Message } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware - Allow all CORS requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));
app.use(express.json());

// Message storage paths
const MESSAGE_DIR = join(__dirname, 'messages');
const JSONL_FILE = join(MESSAGE_DIR, 'all.jsonl');

// Ensure messages directory exists
if (!existsSync(MESSAGE_DIR)) {
  mkdirSync(MESSAGE_DIR, { recursive: true });
}

// Helper: Read all messages from JSONL file
function readMessages(): Message[] {
  if (!existsSync(JSONL_FILE)) {
    return [];
  }

  try {
    const content = readFileSync(JSONL_FILE, 'utf-8');
    const messages = content
      .trim()
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line) as Message);

    // Return newest first
    return messages.reverse();
  } catch (error) {
    console.error('Error reading messages:', error);
    return [];
  }
}

// Helper: Append message to JSONL file
function appendMessage(message: Message): void {
  const jsonLine = JSON.stringify(message) + '\n';

  if (existsSync(JSONL_FILE)) {
    appendFileSync(JSONL_FILE, jsonLine, 'utf-8');
  } else {
    writeFileSync(JSONL_FILE, jsonLine, 'utf-8');
  }
}

// Helper: Save message to group TXT file (human-readable format)
function saveToGroupTxt(message: Message): void {
  const groupTxtFile = join(MESSAGE_DIR, `${message.group}.txt`);
  const txtLine = `[${message.author}]: ${message.content}\n`;

  if (existsSync(groupTxtFile)) {
    appendFileSync(groupTxtFile, txtLine, 'utf-8');
  } else {
    writeFileSync(groupTxtFile, txtLine, 'utf-8');
  }
}

// Helper: Rebuild all group TXT files from current messages
function rebuildGroupTxtFiles(): void {
  const messages = readMessages();
  const groupedMessages: Record<string, Message[]> = {};

  // Group messages by group
  messages.forEach(msg => {
    if (!groupedMessages[msg.group]) {
      groupedMessages[msg.group] = [];
    }
    groupedMessages[msg.group].push(msg);
  });

  // Write each group's TXT file
  Object.entries(groupedMessages).forEach(([group, msgs]) => {
    const groupTxtFile = join(MESSAGE_DIR, `${group}.txt`);
    const content = msgs
      .reverse() // Oldest first
      .map(msg => `[${msg.author}]: ${msg.content}`)
      .join('\n') + '\n';

    writeFileSync(groupTxtFile, content, 'utf-8');
  });
}

// Helper: Update entire JSONL file (for likes)
function updateMessages(messages: Message[]): void {
  const content = messages.reverse().map(msg => JSON.stringify(msg)).join('\n');
  writeFileSync(JSONL_FILE, content + '\n', 'utf-8');
}

// Helper: Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper: Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// API Routes

// Get all messages (without password hashes)
app.get('/api/messages', (req, res) => {
  try {
    const messages = readMessages();
    // Remove password hashes before sending to client
    const sanitizedMessages = messages.map(({ passwordHash, ...msg }) => msg);
    res.json(sanitizedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add new message
app.post('/api/messages', (req, res) => {
  try {
    const { password, ...messageData } = req.body;
    const message: Message = messageData;

    // Validate message
    if (!message.id || !message.author || !message.group || !message.content) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Hash password if provided
    if (password) {
      message.passwordHash = hashPassword(password);
    }

    // Save to JSONL file
    appendMessage(message);

    // Save to group TXT file
    saveToGroupTxt(message);

    // Remove password hash before sending response
    const { passwordHash, ...sanitizedMessage } = message;
    res.status(201).json(sanitizedMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Like a message
app.post('/api/messages/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const messages = readMessages();

    // Find and update message
    const messageIndex = messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    messages[messageIndex].likes = (messages[messageIndex].likes || 0) + 1;

    // Update JSONL file
    updateMessages(messages);

    const { passwordHash, ...sanitizedMessage } = messages[messageIndex];
    res.json(sanitizedMessage);
  } catch (error) {
    console.error('Error liking message:', error);
    res.status(500).json({ error: 'Failed to like message' });
  }
});

// Verify password for a message
app.post('/api/messages/:id/verify', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const messages = readMessages();
    const message = messages.find(msg => msg.id === id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message is not password protected' });
    }

    const isValid = verifyPassword(password, message.passwordHash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Update a message
app.put('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { password, author, content } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const messages = readMessages();
    const messageIndex = messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[messageIndex];

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message cannot be edited' });
    }

    if (!verifyPassword(password, message.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update message fields
    if (author) message.author = author;
    if (content) message.content = content;

    // Update JSONL file
    updateMessages(messages);

    // Rebuild TXT files
    rebuildGroupTxtFiles();

    const { passwordHash, ...sanitizedMessage } = message;
    res.json(sanitizedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message
app.delete('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const messages = readMessages();
    const messageIndex = messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[messageIndex];

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message cannot be deleted' });
    }

    if (!verifyPassword(password, message.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Remove message
    messages.splice(messageIndex, 1);

    // Update JSONL file
    updateMessages(messages);

    // Rebuild TXT files
    rebuildGroupTxtFiles();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Start server - Listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Messages stored in: ${MESSAGE_DIR}`);

  // Rebuild TXT files on startup
  rebuildGroupTxtFiles();
  console.log(`📝 Group TXT files rebuilt`);
});
