import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

/**
 * Initializes the Socket.IO server with JWT Handshake authentication & tenant room isolation
 * @param {import('http').Server} server - The HTTP server to attach Socket.IO to
 * @returns {Server} The initialized Socket.IO server instance
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || 
                  (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]);

    if (!token) {
      // Allow unauthenticated connections in fallback modes or reject cleanly
      socket.user = { role: 'GUEST', tenantId: null };
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.warn('[Socket.IO Auth Warning] Token verification failed:', err.message);
        socket.user = { role: 'GUEST', tenantId: null };
        return next();
      }

      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const { role, tenantId, username } = socket.user || {};

    console.log(`-----------------------------------
[Socket.IO] Client Connected
ID: ${socket.id}
User: ${username || 'Anonymous'}
Role: ${role || 'GUEST'}
TenantId: ${tenantId || 'None'}
Time: ${new Date().toISOString()}
-----------------------------------`);

    // Join room based on role & tenantId
    if (role === 'SUPER_ADMIN') {
      socket.join('superadmin_room');
      console.log(`[Socket.IO] Socket ${socket.id} joined 'superadmin_room'`);
    }

    if (tenantId) {
      const roomName = `tenant:${tenantId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room '${roomName}'`);
    }

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
