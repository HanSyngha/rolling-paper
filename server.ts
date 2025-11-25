import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import type { Message } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DOWNLOAD_PASSWORD = 'dt2025-pw';

// ============ SSE & Memory Cache ============
// In-memory cache for fast reads
let messagesCache: Message[] = [];
let cacheInitialized = false;

// SSE clients management
const sseClients: Set<express.Response> = new Set();

// Broadcast to all SSE clients
function broadcastUpdate() {
  const sanitizedMessages = messagesCache.map(({ passwordHash, ...msg }) => msg);
  const data = JSON.stringify(sanitizedMessages);

  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// Initialize cache from file
function initializeCache() {
  if (!cacheInitialized) {
    messagesCache = readMessagesFromFile();
    cacheInitialized = true;
    console.log(`📦 Cache initialized with ${messagesCache.length} messages`);
  }
}

// ============ Middleware ============
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

// Helper: Read all messages from JSONL file (direct file read)
function readMessagesFromFile(): Message[] {
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

// Helper: Get messages from cache (fast)
function getMessages(): Message[] {
  initializeCache();
  return messagesCache;
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
  const messages = getMessages();
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

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial data
  initializeCache();
  const sanitizedMessages = messagesCache.map(({ passwordHash, ...msg }) => msg);
  res.write(`data: ${JSON.stringify(sanitizedMessages)}\n\n`);

  // Add client to set
  sseClients.add(res);
  console.log(`📡 SSE client connected. Total: ${sseClients.size}`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`📡 SSE client disconnected. Total: ${sseClients.size}`);
  });
});

// Get all messages (without password hashes)
app.get('/api/messages', (req, res) => {
  try {
    const messages = getMessages();
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

    // Update cache (add to beginning for newest first)
    messagesCache.unshift(message);

    // Broadcast to all SSE clients
    broadcastUpdate();

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
    const messages = getMessages();

    // Find and update message
    const messageIndex = messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    messages[messageIndex].likes = (messages[messageIndex].likes || 0) + 1;

    // Update JSONL file
    updateMessages(messages);

    // Broadcast to all SSE clients
    broadcastUpdate();

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

    const messages = getMessages();
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

    const messages = getMessages();
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

    // Broadcast to all SSE clients
    broadcastUpdate();

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

    const messages = getMessages();
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

    // Remove message from cache
    messagesCache.splice(messageIndex, 1);

    // Update JSONL file
    updateMessages(messagesCache);

    // Rebuild TXT files
    rebuildGroupTxtFiles();

    // Broadcast to all SSE clients
    broadcastUpdate();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Download all TXT files as ZIP
app.post('/api/download-txt', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password !== DOWNLOAD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get all TXT files
    const files = readdirSync(MESSAGE_DIR).filter(file => file.endsWith('.txt'));

    if (files.length === 0) {
      return res.status(404).json({ error: 'No TXT files found' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=messages.zip');

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create ZIP file' });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add each TXT file to the archive
    files.forEach(file => {
      const filePath = join(MESSAGE_DIR, file);
      archive.file(filePath, { name: file });
    });

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error('Error downloading TXT files:', error);
    res.status(500).json({ error: 'Failed to download TXT files' });
  }
});

// Start server - Listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Messages stored in: ${MESSAGE_DIR}`);

  // Initialize cache on startup
  initializeCache();

  // Rebuild TXT files on startup
  rebuildGroupTxtFiles();
  console.log(`📝 Group TXT files rebuilt`);
  console.log(`📡 SSE endpoint ready at /api/events`);
});
