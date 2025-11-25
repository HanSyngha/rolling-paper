import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from 'redis';
import archiver from 'archiver';
import type { Message } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const app = express();
const PORT = 3001;
const DOWNLOAD_PASSWORD = 'dt2025-pw';

// ============ Database Connections ============
// PostgreSQL connection
const pgPool = new Pool({
  host: 'localhost',
  port: 9700,
  database: 'rollingpaper',
  user: 'rollingpaper',
  password: 'rollingpaper2025',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
const redisClient = createClient({
  socket: {
    host: 'localhost',
    port: 9701,
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

// Connect to Redis
await redisClient.connect();

// Test PostgreSQL connection
pgPool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pgPool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// ============ PostgreSQL LISTEN for real-time notifications ============
let notificationClient: pg.Client | null = null;

async function setupDatabaseNotifications() {
  try {
    notificationClient = await pgPool.connect();

    // Listen to messages_changed channel
    await notificationClient.query('LISTEN messages_changed');

    notificationClient.on('notification', async (msg) => {
      if (msg.channel === 'messages_changed') {
        console.log('📢 Database change detected:', msg.payload);

        // Invalidate cache
        await invalidateCache();

        // Broadcast to all SSE clients
        await broadcastUpdate();
      }
    });

    console.log('🔔 Database notification listener established');
  } catch (error) {
    console.error('Failed to setup database notifications:', error);
  }
}

// ============ SSE Clients ============
const sseClients: Set<express.Response> = new Set();

// Broadcast to all SSE clients
async function broadcastUpdate() {
  const messages = await getMessages();
  const sanitizedMessages = messages.map(({ passwordHash, ...msg }) => {
    // 비공개 메시지는 내용을 숨김
    if (msg.isPrivate) {
      return { ...msg, content: '' };
    }
    return msg;
  });
  const data = JSON.stringify(sanitizedMessages);

  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// ============ Middleware ============
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));
app.use(express.json());

// ============ Helper Functions ============

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Get all messages (with Redis caching)
async function getMessages(): Promise<Message[]> {
  try {
    // Try Redis cache first
    const cached = await redisClient.get('messages:all');
    if (cached) {
      return JSON.parse(cached);
    }

    // If not in cache, fetch from PostgreSQL
    const result = await pgPool.query(
      'SELECT id, author, "group", content, timestamp, likes, password_hash as "passwordHash", is_private as "isPrivate" FROM messages ORDER BY timestamp DESC'
    );

    const messages = result.rows as Message[];

    // Update Redis cache (expire after 60 seconds for consistency)
    await redisClient.setEx('messages:all', 60, JSON.stringify(messages));

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Get single message by ID (with Redis caching)
async function getMessageById(id: string): Promise<Message | null> {
  try {
    // Try Redis cache first
    const cached = await redisClient.get(`message:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // If not in cache, fetch from PostgreSQL
    const result = await pgPool.query(
      'SELECT id, author, "group", content, timestamp, likes, password_hash as "passwordHash", is_private as "isPrivate" FROM messages WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0] as Message;

    // Update Redis cache
    await redisClient.setEx(`message:${id}`, 300, JSON.stringify(message));

    return message;
  } catch (error) {
    console.error('Error getting message by ID:', error);
    throw error;
  }
}

// Invalidate cache
async function invalidateCache() {
  try {
    await redisClient.del('messages:all');
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

// Add new message to database
async function addMessage(message: Message): Promise<void> {
  try {
    await pgPool.query(
      'INSERT INTO messages (id, author, "group", content, timestamp, likes, password_hash, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [message.id, message.author, message.group, message.content, message.timestamp, message.likes || 0, message.passwordHash || null, message.isPrivate || false]
    );

    // Invalidate cache
    await invalidateCache();
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// Update message in database
async function updateMessage(id: string, updates: { author?: string; content?: string }): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.author) {
      fields.push(`author = $${paramCount++}`);
      values.push(updates.author);
    }

    if (updates.content) {
      fields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    values.push(id);

    await pgPool.query(
      `UPDATE messages SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Invalidate cache
    await invalidateCache();
    await redisClient.del(`message:${id}`);
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

// Delete message from database
async function deleteMessage(id: string): Promise<void> {
  try {
    await pgPool.query('DELETE FROM messages WHERE id = $1', [id]);

    // Invalidate cache
    await invalidateCache();
    await redisClient.del(`message:${id}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

// Like a message
async function likeMessage(id: string): Promise<void> {
  try {
    await pgPool.query('UPDATE messages SET likes = likes + 1 WHERE id = $1', [id]);

    // Invalidate cache
    await invalidateCache();
    await redisClient.del(`message:${id}`);
  } catch (error) {
    console.error('Error liking message:', error);
    throw error;
  }
}

// Generate TXT content for a group
async function generateGroupTxt(group: string): Promise<string> {
  try {
    const result = await pgPool.query(
      'SELECT author, content FROM messages WHERE "group" = $1 ORDER BY timestamp ASC',
      [group]
    );

    if (result.rows.length === 0) {
      return '';
    }

    return result.rows
      .map(row => `[${row.author}]: ${row.content}`)
      .join('\n') + '\n';
  } catch (error) {
    console.error('Error generating group TXT:', error);
    throw error;
  }
}

// ============ API Routes ============

// SSE endpoint for real-time updates
app.get('/api/events', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Send initial data
    const messages = await getMessages();
    const sanitizedMessages = messages.map(({ passwordHash, ...msg }) => {
      // 비공개 메시지는 내용을 숨김
      if (msg.isPrivate) {
        return { ...msg, content: '' };
      }
      return msg;
    });
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
  } catch (error) {
    console.error('Error in SSE endpoint:', error);
    res.status(500).end();
  }
});

// Get all messages (without password hashes, with private content hidden)
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await getMessages();
    // Remove password hashes and hide private content
    const sanitizedMessages = messages.map(({ passwordHash, ...msg }) => {
      // 비공개 메시지는 내용을 숨김
      if (msg.isPrivate) {
        return { ...msg, content: '' };
      }
      return msg;
    });
    res.json(sanitizedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add new message
app.post('/api/messages', async (req, res) => {
  try {
    const { password, isPrivate, ...messageData } = req.body;
    const message: Message = { ...messageData, isPrivate: isPrivate || false };

    // Validate message
    if (!message.id || !message.author || !message.group || !message.content) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // 비공개 메시지는 반드시 비밀번호가 있어야 함
    if (message.isPrivate && !password) {
      return res.status(400).json({ error: '비공개 메시지는 비밀번호가 필요합니다' });
    }

    // Hash password if provided
    if (password) {
      message.passwordHash = hashPassword(password);
    }

    // Save to database
    await addMessage(message);

    // Database trigger will automatically broadcast via LISTEN/NOTIFY

    // Remove password hash before sending response
    const { passwordHash, ...sanitizedMessage } = message;
    // 비공개 메시지는 응답에서도 내용 숨김
    if (sanitizedMessage.isPrivate) {
      res.status(201).json({ ...sanitizedMessage, content: '' });
    } else {
      res.status(201).json(sanitizedMessage);
    }
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Like a message
app.post('/api/messages/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await getMessageById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await likeMessage(id);

    // Database trigger will automatically broadcast via LISTEN/NOTIFY

    // Get updated message
    const updatedMessage = await getMessageById(id);
    const { passwordHash, ...sanitizedMessage } = updatedMessage!;
    res.json(sanitizedMessage);
  } catch (error) {
    console.error('Error liking message:', error);
    res.status(500).json({ error: 'Failed to like message' });
  }
});

// Verify password for a message
app.post('/api/messages/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const message = await getMessageById(id);

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

// Get private message content (비공개 메시지 내용 조회)
app.post('/api/messages/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const message = await getMessageById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.isPrivate) {
      // 공개 메시지는 그냥 내용 반환
      return res.json({ content: message.content });
    }

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message has no password' });
    }

    if (!verifyPassword(password, message.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 비밀번호가 맞으면 내용 반환
    res.json({ content: message.content });
  } catch (error) {
    console.error('Error getting private message content:', error);
    res.status(500).json({ error: 'Failed to get message content' });
  }
});

// Update a message
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, author, content } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const message = await getMessageById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message cannot be edited' });
    }

    if (!verifyPassword(password, message.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update message fields
    await updateMessage(id, { author, content });

    // Database trigger will automatically broadcast via LISTEN/NOTIFY

    // Get updated message
    const updatedMessage = await getMessageById(id);
    const { passwordHash, ...sanitizedMessage } = updatedMessage!;
    res.json(sanitizedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const message = await getMessageById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.passwordHash) {
      return res.status(403).json({ error: 'This message cannot be deleted' });
    }

    if (!verifyPassword(password, message.passwordHash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete message
    await deleteMessage(id);

    // Database trigger will automatically broadcast via LISTEN/NOTIFY

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Download all TXT files as ZIP (generated from database)
app.post('/api/download-txt', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password !== DOWNLOAD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get all unique groups from database
    const groupsResult = await pgPool.query(
      'SELECT DISTINCT "group" FROM messages ORDER BY "group"'
    );

    const groups = groupsResult.rows.map(row => row.group);

    if (groups.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
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

    // Generate and add each group's TXT file to the archive
    for (const group of groups) {
      const content = await generateGroupTxt(group);
      if (content) {
        archive.append(content, { name: `${group}.txt` });
      }
    }

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error('Error downloading TXT files:', error);
    res.status(500).json({ error: 'Failed to download TXT files' });
  }
});

// ============ Static File Serving (Production) ============
// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all non-API routes
// Express 5 requires named parameter for wildcard routes
app.get('/{*splat}', (req, res) => {
  // Only serve index.html for non-API requests
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start server - Listen on all network interfaces
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🗄️  PostgreSQL: localhost:9700`);
  console.log(`📦 Redis: localhost:9701`);
  console.log(`📡 SSE endpoint ready at /api/events`);

  // Setup database notification listener for real-time updates
  await setupDatabaseNotifications();

  // Pre-warm cache
  try {
    const messages = await getMessages();
    console.log(`✅ Cache pre-warmed with ${messages.length} messages`);
  } catch (error) {
    console.error('Failed to pre-warm cache:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (notificationClient) {
    notificationClient.release();
  }
  await redisClient.quit();
  await pgPool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (notificationClient) {
    notificationClient.release();
  }
  await redisClient.quit();
  await pgPool.end();
  process.exit(0);
});
