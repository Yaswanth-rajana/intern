# Indoor Air Quality (IAQ) MQTT Publisher

This is a Node.js script that simulates an Indoor Air Quality Monitoring device. It generates mock telemetry data and publishes it to an MQTT broker over a secure TLS connection.

## Features

- Uses MQTT over TLS (`mqtts://`) for secure communication.
- Simulates sensor data (AQI, CO2, Humidity, Temperature, VOC, NOX, PM1.0, PM2.5, PM4.0, PM10).
- Publishes data every 1 second as JSON.
- Automatically reconnects if the connection is lost.
- Built using Node.js, `mqtt` library, and ES Modules.

## Requirements

- Node.js (v14 or newer)
- An MQTT broker supporting TLS (e.g., EMQX Cloud)

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and provide your MQTT broker details:
     ```env
     MQTT_HOST=your-emqx-host.emqx.cloud
     MQTT_PORT=8883
     MQTT_USERNAME=your-username
     MQTT_PASSWORD=your-password
     MQTT_TOPIC=iaq/device/IAQ-0001
     ```

3. **Run the publisher:**
   ```bash
   npm start
   ```

## Payload Structure

The publisher generates and sends the following JSON structure:

```json
{
  "deviceId": "IAQ-0001",
  "firmwareVersion": "1.0.0",
  "hardwareVersion": "T113i-RevA",
  "sensors": {
    "AQI": 120,
    "CO2": 800,
    "Humidity": 45,
    "Temperature": 22,
    "VOC": 150,
    "NOX": 40,
    "PM1.0": 12,
    "PM2.5": 30,
    "PM4.0": 55,
    "PM10": 80
  },
  "timestamp": "2023-10-01T12:00:00.000Z"
}
```
