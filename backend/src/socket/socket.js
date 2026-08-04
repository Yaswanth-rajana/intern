import { Server } from 'socket.io';

let io;

/**
 * Initializes the Socket.IO server with the given HTTP server
 * @param {import('http').Server} server - The HTTP server to attach Socket.IO to
 * @returns {Server} The initialized Socket.IO server instance
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust origins as needed in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`-----------------------------------
[Socket.IO] Client Connected
ID: ${socket.id}
Time: ${new Date().toISOString()}
-----------------------------------`);

    socket.on('disconnect', (reason) => {
      console.log(`-----------------------------------
[Socket.IO] Client Disconnected
ID: ${socket.id}
Reason: ${reason}
Time: ${new Date().toISOString()}
-----------------------------------`);
    });
  });

  return io;
};

/**
 * Returns the initialized io instance
 * @returns {Server} The initialized Socket.IO server instance
 * @throws {Error} If Socket.IO has not been initialized
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

/**
 * Gracefully close the Socket.IO server
 */
export const closeSocket = () => {
  if (io) {
    io.close(() => {
      console.log('✓ Socket.IO Connection Closed Cleanly');
    });
  }
};
