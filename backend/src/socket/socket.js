import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import ViewerDeviceAccess from '../models/ViewerDeviceAccess.js';

let io;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

/**
 * Initializes the Socket.IO server with JWT Handshake authentication & tenant/device room isolation
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

  io.on('connection', async (socket) => {
    const { role, tenantId, username, userId, id } = socket.user || {};
    const effectiveUserId = userId || id;

    console.log(`-----------------------------------
[Socket.IO] Client Connected
ID: ${socket.id}
User: ${username || 'Anonymous'} (${effectiveUserId || 'None'})
Role: ${role || 'GUEST'}
TenantId: ${tenantId || 'None'}
Time: ${new Date().toISOString()}
-----------------------------------`);

    // 1. Super Admin joins global superadmin room
    if (role === 'SUPER_ADMIN') {
      socket.join('superadmin_room');
      console.log(`[Socket.IO] Socket ${socket.id} joined 'superadmin_room'`);
    }

    // 2. Client Admin joins tenant admin room (receives all tenant devices)
    if (role === 'CLIENT_ADMIN' && tenantId) {
      socket.join(`tenant_admin:${tenantId}`);
      socket.join(`tenant:${tenantId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined 'tenant_admin:${tenantId}'`);
    }

    // 3. Viewer joins ONLY their assigned device rooms
    if (role === 'VIEWER') {
      if (effectiveUserId) {
        socket.join(`viewer:${effectiveUserId}`);
        try {
          const assignments = await ViewerDeviceAccess.find({ viewerId: effectiveUserId }).lean();
          assignments.forEach(a => {
            socket.join(`device:${a.deviceId}`);
            console.log(`[Socket.IO] Viewer ${username} socket ${socket.id} joined 'device:${a.deviceId}'`);
          });
        } catch (err) {
          console.error('[Socket.IO] Failed to load viewer device rooms:', err.message);
        }
      }
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
 * Dynamically synchronizes device rooms for all active sockets of a specific viewer
 * @param {string} viewerId - Target viewer's user ID
 * @param {string[]} newDeviceIds - List of device IDs now assigned to viewer
 */
export const syncViewerSocketRooms = async (viewerId, newDeviceIds = []) => {
  if (!io) return;
  try {
    const targetRoom = `viewer:${viewerId}`;
    const sockets = await io.in(targetRoom).fetchSockets();

    for (const socket of sockets) {
      // Leave all existing device rooms (matching pattern device:*)
      for (const room of socket.rooms) {
        if (room.startsWith('device:')) {
          socket.leave(room);
        }
      }
      // Join newly assigned device rooms
      newDeviceIds.forEach(devId => {
        socket.join(`device:${devId}`);
      });
    }
  } catch (err) {
    console.error('[Socket.IO] Failed to sync viewer socket rooms:', err.message);
  }
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
