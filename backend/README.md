# Indoor Air Quality Monitoring Platform - Backend

This is Phase 2 of the Indoor Air Quality Monitoring Platform, containing the backend MQTT service.

## Tech Stack
- Node.js
- Express
- MQTT.js
- Socket.IO
- dotenv
- cors

## Project Structure
- `src/config/mqtt.js`: Configuration variables for MQTT, loaded from `.env`.
- `src/socket/socket.js`: Socket.IO initialization and instance management.
- `src/services/mqttService.js`: Handles MQTT connection, TLS, subscription, reconnection, message parsing, state maintenance, and emitting to Socket.IO clients.
- `src/routes/health.js`: Healthcheck REST endpoint (`/health`).
- `src/app.js`: Express application setup and middleware configuration.
- `src/server.js`: Application entry point. Creates HTTP server, attaches Socket.IO, initializes MQTT service, and listens on port.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your MQTT credentials.
   ```bash
   cp .env.example .env
   ```

3. **Run the server:**
   ```bash
   npm start
   ```
   For development (with nodemon):
   ```bash
   npm run dev
   ```
