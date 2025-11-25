import { Message } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Retry helper function with exponential backoff
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 5,
  initialDelay = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // If server responds (even with error), return the response
      return response;
    } catch (error) {
      lastError = error as Error;

      // If this is the last retry, throw the error
      if (i === maxRetries - 1) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = initialDelay * Math.pow(1.5, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Fetch failed');
}

export const backend = {
  getMessages: async (): Promise<Message[]> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  addMessage: async (message: Message, password?: string): Promise<Message> => {
    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...message, password }),
        },
        3, // Fewer retries for write operations
        1000 // Longer initial delay
      );

      if (!response.ok) {
        throw new Error('Failed to add message');
      }

      const savedMessage = await response.json();

      // Dispatch custom event for real-time update
      window.dispatchEvent(new CustomEvent('message-update'));

      return savedMessage;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },

  likeMessage: async (id: string): Promise<void> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/messages/${id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to like message');
      }

      // Dispatch custom event for real-time update
      window.dispatchEvent(new CustomEvent('message-update'));
    } catch (error) {
      console.error('Error liking message:', error);
      throw error;
    }
  },

  verifyPassword: async (id: string, password: string): Promise<boolean> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/messages/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  },

  updateMessage: async (id: string, updates: { author?: string; content?: string }, password: string): Promise<Message> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...updates, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      const updatedMessage = await response.json();

      // Dispatch custom event for real-time update
      window.dispatchEvent(new CustomEvent('message-update'));

      return updatedMessage;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  },

  deleteMessage: async (id: string, password: string): Promise<void> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Dispatch custom event for real-time update
      window.dispatchEvent(new CustomEvent('message-update'));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  downloadTxtFiles: async (password: string): Promise<void> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/download-txt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download files');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'messages.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading TXT files:', error);
      throw error;
    }
  },

  // Subscribe to changes with polling for cross-tab/browser sync
  subscribe: (callback: (messages: Message[]) => void) => {
    let lastMessageCount = 0;
    let lastMessageIds = '';

    const handler = async () => {
      const messages = await backend.getMessages();

      // Check if messages have changed (compare count and IDs)
      const currentIds = messages.map(m => m.id).join(',');
      if (messages.length !== lastMessageCount || currentIds !== lastMessageIds) {
        lastMessageCount = messages.length;
        lastMessageIds = currentIds;
        callback(messages);
      }
    };

    // Handler for local events (same tab)
    const localHandler = async () => {
      const messages = await backend.getMessages();
      lastMessageCount = messages.length;
      lastMessageIds = messages.map(m => m.id).join(',');
      callback(messages);
    };

    window.addEventListener('message-update', localHandler);

    // Initial call
    localHandler();

    // Poll for changes from other tabs/browsers every 1 second
    const pollInterval = setInterval(handler, 1000);

    return () => {
      window.removeEventListener('message-update', localHandler);
      clearInterval(pollInterval);
    };
  }
};
