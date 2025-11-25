import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import type { Message } from './types';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MESSAGE_DIR = join(__dirname, 'messages');
const JSONL_FILE = join(MESSAGE_DIR, 'all.jsonl');

const pgPool = new Pool({
  host: 'localhost',
  port: 9700,
  database: 'rollingpaper',
  user: 'rollingpaper',
  password: 'rollingpaper2025',
});

async function migrateData() {
  console.log('🔄 Starting migration from JSONL to PostgreSQL...');

  if (!existsSync(JSONL_FILE)) {
    console.log('⚠️  No JSONL file found. Nothing to migrate.');
    process.exit(0);
  }

  try {
    // Read JSONL file
    const content = readFileSync(JSONL_FILE, 'utf-8');
    const messages = content
      .trim()
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line) as Message);

    console.log(`📦 Found ${messages.length} messages to migrate`);

    // Insert each message into PostgreSQL
    for (const message of messages) {
      await pgPool.query(
        'INSERT INTO messages (id, author, "group", content, timestamp, likes, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        [
          message.id,
          message.author,
          message.group,
          message.content,
          message.timestamp,
          message.likes || 0,
          message.passwordHash || null
        ]
      );
    }

    console.log('✅ Migration completed successfully!');

    // Verify migration
    const result = await pgPool.query('SELECT COUNT(*) FROM messages');
    console.log(`📊 Total messages in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

migrateData();
