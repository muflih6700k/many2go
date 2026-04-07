import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt?: Date;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [receivedMessage, setReceivedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('join', user.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('new_message', (data: { message: Message; roomId: string }) => {
      console.log('Received new message:', data);
      setReceivedMessage(data.message);
      setMessages((prev) => [...prev, data.message]);
    });

    socket.on('message_sent', (data: { message: Message }) => {
      console.log('Message confirmed sent:', data);
      setMessages((prev) => [...prev, data.message]);
    });

    socket.on('message_error', (data: { error: string }) => {
      console.error('Message error:', data.error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const sendMessage = (recipientId: string, body: string) => {
    if (!socketRef.current || !user || !isConnected) {
      console.error('Cannot send message: not connected');
      return false;
    }

    socketRef.current.emit('send_message', {
      senderId: user.id,
      recipientId,
      body,
    });

    // Optimistic update
    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      senderId: user.id,
      recipientId,
      body,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name, email: user.email },
    };
    setMessages((prev) => [...prev, optimisticMessage as Message]);

    return true;
  };

  const markAsRead = (messageIds: string[]) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mark_read', { messageIds });
  };

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    receivedMessage,
    sendMessage,
    markAsRead,
    setMessages,
  };
}
