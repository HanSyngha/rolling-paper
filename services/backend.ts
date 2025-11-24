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

  addMessage: async (message: Message): Promise<Message> => {
    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
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

  // Subscribe to changes
  subscribe: (callback: (messages: Message[]) => void) => {
    const handler = async () => {
      const messages = await backend.getMessages();
      callback(messages);
    };

    window.addEventListener('message-update', handler);

    // Initial call
    handler();

    return () => {
      window.removeEventListener('message-update', handler);
    };
  }
};
