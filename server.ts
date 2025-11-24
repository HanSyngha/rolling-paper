import express from 'express';
import cors from 'cors';
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
  const timestamp = new Date(message.timestamp).toLocaleString('ko-KR');
  const txtLine = `[${timestamp}] ${message.author}: ${message.content}\n`;

  if (existsSync(groupTxtFile)) {
    appendFileSync(groupTxtFile, txtLine, 'utf-8');
  } else {
    writeFileSync(groupTxtFile, txtLine, 'utf-8');
  }
}

// Helper: Update entire JSONL file (for likes)
function updateMessages(messages: Message[]): void {
  const content = messages.reverse().map(msg => JSON.stringify(msg)).join('\n');
  writeFileSync(JSONL_FILE, content + '\n', 'utf-8');
}

// API Routes

// Get all messages
app.get('/api/messages', (req, res) => {
  try {
    const messages = readMessages();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add new message
app.post('/api/messages', (req, res) => {
  try {
    const message: Message = req.body;

    // Validate message
    if (!message.id || !message.author || !message.group || !message.content) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Save to JSONL file
    appendMessage(message);

    // Save to group TXT file
    saveToGroupTxt(message);

    res.status(201).json(message);
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

    res.json(messages[messageIndex]);
  } catch (error) {
    console.error('Error liking message:', error);
    res.status(500).json({ error: 'Failed to like message' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Messages stored in: ${MESSAGE_DIR}`);
});
