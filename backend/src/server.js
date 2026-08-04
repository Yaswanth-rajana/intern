import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';
import { initSocket, closeSocket } from './socket/socket.js';
import { initMqttService, disconnectMqtt, loadDevicesIntoCache } from './services/mqttService.js';
import { connectDB } from './config/database.js';

// Load variables from .env
dotenv.config();

const PORT = process.env.PORT || 5001;

// Create HTTP server wrapping the Express app
const server = http.createServer(app);

// Initialize Socket.IO with the server
initSocket(server);

// Start server initialization
const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();
  
  // 2. Load devices into memory cache so frontend is instantly ready
  await loadDevicesIntoCache();

  // 3. Initialize MQTT connection and subscriptions
  initMqttService();

  // 4. Start listening on the specified port
  server.listen(PORT, () => {
    console.log(`✓ Express Started on port ${PORT}`);
  });
};

startServer();

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down gracefully...');
  
  disconnectMqtt();
  closeSocket();
  
  server.close(() => {
    console.log('✓ Express Server Closed Cleanly');
    process.exit(0);
  });
  
  // Force shutdown if it takes too long
  setTimeout(() => {
    console.error('Forcing shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
