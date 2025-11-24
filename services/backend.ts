import { Message } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export const backend = {
  getMessages: async (): Promise<Message[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages`);
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
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

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
      const response = await fetch(`${API_BASE_URL}/messages/${id}/like`, {
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
