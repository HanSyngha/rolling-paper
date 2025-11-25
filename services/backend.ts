import { Message } from '../types';

// Use relative URL to work with Vite proxy in development
// and same-origin deployment in production
const API_BASE_URL = '/api';

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

  // Subscribe to changes using SSE (Server-Sent Events) for real-time updates
  subscribe: (callback: (messages: Message[]) => void) => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      // Close existing connection if any
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`${API_BASE_URL}/events`);

      eventSource.onmessage = (event) => {
        try {
          const messages = JSON.parse(event.data) as Message[];
          callback(messages);
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE connection lost, reconnecting in 2s...');
        eventSource?.close();
        eventSource = null;

        // Reconnect after 2 seconds
        reconnectTimeout = setTimeout(connect, 2000);
      };

      eventSource.onopen = () => {
        console.log('SSE connection established');
      };
    };

    // Start connection
    connect();

    // Return cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }
};
