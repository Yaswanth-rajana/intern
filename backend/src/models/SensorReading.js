import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  receivedAt: { type: Date, required: true },

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

  firmwareVersion: { type: String, default: 'Unknown' },
  hardwareVersion: { type: String, default: 'Unknown' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Indexes for performance at scale
sensorReadingSchema.index({ deviceId: 1, timestamp: -1 });
sensorReadingSchema.index({ tenantId: 1, deviceId: 1, timestamp: -1 });
sensorReadingSchema.index({ timestamp: -1 });

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema, 'sensor_readings');

export default SensorReading;
