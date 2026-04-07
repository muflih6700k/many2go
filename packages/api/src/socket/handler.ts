import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/prisma';

export const socketHandler = (io: SocketIOServer) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User joins their personal room
    socket.on('join', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined room`);
    });

    // User leaves their personal room
    socket.on('leave', (userId: string) => {
      socket.leave(`user:${userId}`);
      console.log(`User ${userId} left room`);
    });

    // Handle message sending
    socket.on('send_message', async (data: { senderId: string; recipientId: string; body: string }) => {
      try {
        // Save message to database
        const message = await prisma.message.create({
          data: {
            senderId: data.senderId,
            recipientId: data.recipientId,
            body: data.body,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Fan out to recipient's room
        io.to(`user:${data.recipientId}`).emit('new_message', {
          message,
          roomId: `user:${data.recipientId}`,
        });

        // Also confirm to sender
        socket.emit('message_sent', { message });
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data: { messageIds: string[] }) => {
      try {
        await prisma.message.updateMany({
          where: { id: { in: data.messageIds } },
          data: { readAt: new Date() },
        });
        socket.emit('marked_read', { messageIds: data.messageIds });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

// Helper to broadcast to specific user
export const notifyUser = (io: SocketIOServer, userId: string, event: string, data: unknown) => {
  io.to(`user:${userId}`).emit(event, data);
};
