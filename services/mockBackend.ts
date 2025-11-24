import { Message } from '../types';

/**
 * MOCK BACKEND SERVICE
 * 
 * Simulated backend without a real server.
 * Storage: LocalStorage
 * Format: JSON Lines (newline delimited JSON objects)
 * 
 * Implements:
 * 1. Saving/Loading as single file JSON Lines in 'messages/all.jsonl'
 * 2. Appending to 'messages/{GroupName}.txt' (simulated)
 */

// We use a path-like key to simulate the file structure requested
const JSONL_STORAGE_KEY = 'messages/all.jsonl';
const GROUP_TXT_PREFIX = 'messages/';

export const mockBackend = {
  getMessages: (): Message[] => {
    const stored = localStorage.getItem(JSONL_STORAGE_KEY);
    
    if (!stored) {
      return [];
    }

    // Parse JSON Lines: Split by newline, filter empty lines, parse JSON
    try {
      const messages = stored
        .trim()
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => JSON.parse(line));

      // Return reversed (Newest first) because files are typically appended (Oldest first)
      return messages.reverse();
    } catch (e) {
      console.error("Failed to parse messages file:", e);
      return [];
    }
  },

  addMessage: (message: Message) => {
    // 1. Save to main JSON Lines file (messages/all.jsonl)
    const jsonLine = JSON.stringify(message);
    const currentFileContent = localStorage.getItem(JSONL_STORAGE_KEY) || '';
    
    // Append to file (newline + new content)
    // If file is empty, just content. If not, newline + content.
    const newFileContent = currentFileContent 
      ? currentFileContent + '\n' + jsonLine 
      : jsonLine;
      
    localStorage.setItem(JSONL_STORAGE_KEY, newFileContent);

    // 2. Save to Group Text File (messages/{GroupName}.txt)
    // Format: "Name: Message Content"
    const groupFileKey = `${GROUP_TXT_PREFIX}${message.group}.txt`;
    const txtLine = `${message.author}: ${message.content}`;
    const currentGroupContent = localStorage.getItem(groupFileKey) || '';
    const newGroupContent = currentGroupContent
      ? currentGroupContent + '\n' + txtLine
      : txtLine;
    
    localStorage.setItem(groupFileKey, newGroupContent);
    
    // Dispatch custom event for real-time update in other tabs
    window.dispatchEvent(new CustomEvent('local-message-update'));
    
    return message;
  },

  likeMessage: (id: string) => {
    // For likes, since we are using JSON Lines (append-only log usually),
    // we have to read the whole file, update the object, and rewrite the file.
    // In a real append-only system, this would be a new event, but here we rewrite for simplicity.
    const currentMessages = mockBackend.getMessages().reverse(); // Get in chronological order
    const newMessages = currentMessages.map(msg => 
      msg.id === id ? { ...msg, likes: (msg.likes || 0) + 1 } : msg
    );
    
    // Re-serialize to JSON Lines
    const newFileContent = newMessages.map(msg => JSON.stringify(msg)).join('\n');
    localStorage.setItem(JSONL_STORAGE_KEY, newFileContent);
    
    window.dispatchEvent(new CustomEvent('local-message-update'));
  },

  // Subscribe to changes
  subscribe: (callback: (messages: Message[]) => void) => {
    const handler = () => {
      callback(mockBackend.getMessages());
    };

    window.addEventListener('storage', (e) => {
      // Refresh if the main file changes
      if (e.key === JSONL_STORAGE_KEY) {
        handler();
      }
    });

    window.addEventListener('local-message-update', handler);

    // Initial call
    handler();

    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('local-message-update', handler);
    };
  }
};