import mongoose from 'mongoose';

const sensorHistorySchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  AQI: { type: Number },
  CO2: { type: Number },
  Temperature: { type: Number },
  Humidity: { type: Number },
  VOC: { type: Number },
  NOX: { type: Number },
  PM1_0: { type: Number },
  PM2_5: { type: Number },
  PM4_0: { type: Number },
  PM10: { type: Number },
  rawPayload: { type: Object },
  topic: { type: String },
  qos: { type: Number },
  retain: { type: Boolean },
  receivedAt: { type: Date, default: Date.now }
});

// Indexes
sensorHistorySchema.index({ deviceId: 1, timestamp: -1 });

// TTL Index: automatically delete documents 180 days after receivedAt
sensorHistorySchema.index({ receivedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const SensorHistory = mongoose.model('SensorHistory', sensorHistorySchema);

export default SensorHistory;
