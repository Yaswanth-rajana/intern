# IAQ Mock MQTT Publisher

A standalone Node.js Mock IAQ MQTT Publisher that simulates real IAQ (Indoor Air Quality) devices and can be deployed as a Render Background Worker.

The publisher connects directly to EMQX Cloud using MQTT over TLS, generates realistic sensor telemetry, and publishes readings every 30 seconds.

## Architecture

The publisher acts strictly as a physical client device and does not connect to the backend database.

```
Mock IAQ Publisher (Render Background Worker)
        │
        │ MQTT over TLS (Port 8883)
        ▼
   EMQX Cloud
        │
        ├──────────► Backend (Render Web Service)
        │
        └──────────► Other Subscribers / Diagnostics
```

---

## Render Deployment

To deploy this publisher on Render as a **Background Worker**:

1. **Render Service Type**: `Background Worker`
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   Configure these via Render's environment variable dashboard:
   - `MQTT_HOST`: *Your EMQX Broker host name*
   - `MQTT_PORT`: `8883`
   - `MQTT_USERNAME`: *Your EMQX username*
   - `MQTT_PASSWORD`: *Your EMQX password*
   - `MQTT_TOPIC_PREFIX`: `iaq/device`
   - `PUBLISH_INTERVAL`: `30000` (in milliseconds)
   - `DEVICE_COUNT`: `3` (simulates OFFICE-01, OFFICE-02, and FACTORY-01)
   - `DEMO_MODE`: `normal` (supports `normal`, `warning`, `critical`)

---

## Local Setup & Run

### 1. Install Dependencies
Navigate to the `mock-publisher` directory and install the dependencies:
```bash
npm install
```

### 2. Configure Environment
Copy the example env file and update it with your EMQX credentials:
```bash
cp .env.example .env
```
Open `.env` and fill in the connection details:
```env
MQTT_HOST=h10b321b.ala.asia-southeast1.emqxsl.com
MQTT_PORT=8883
MQTT_USERNAME=intern
MQTT_PASSWORD=test@1234
MQTT_TOPIC_PREFIX=iaq/device
PUBLISH_INTERVAL=30000
DEVICE_COUNT=3
DEMO_MODE=normal
```

### 3. Run the Publisher
Start the publisher:
```bash
npm start
```

---

## Telemetry Modes

You can dynamically change how the sensors behave by configuring the `DEMO_MODE` environment variable:

- **`normal`** (Default): Generates healthy baseline readings (e.g. CO2 below 800 ppm, AQI below 50). Values will drift slowly over a diurnal 20-minute cycle to simulate daily environmental changes.
- **`warning`**: Sensor readings will smoothly rise above the backend's warning thresholds (e.g. CO2 moves towards 900–1200 ppm).
- **`critical`**: Sensor readings will smoothly rise above the backend's critical limits (e.g. CO2 moves towards 1900–2400 ppm) to trigger critical alarms.

Transitions between modes are gradual (using bounded random walks of ±25 ppm for CO2, ±0.3°C for temp, etc.), simulating natural telemetry behavior instead of instant jumps.
