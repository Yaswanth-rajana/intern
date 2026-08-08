import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

// Singleton socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  auth: (cb) => {
    cb({ token: localStorage.getItem('token') });
  }
});

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  } else {
    // If connected without token or changed user, disconnect and reconnect to join tenant room
    socket.disconnect();
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
