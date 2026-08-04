import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    firmwareVersion: { type: String, default: 'Unknown' },
    hardwareVersion: { type: String, default: 'Unknown' },
    location: { type: String, default: 'Unknown' },
    status: {
      type: String,
      enum: ['Online', 'Warning', 'Offline'],
      default: 'Offline',
    },
    messageCount: { type: Number, default: 0 },
    packetsToday: { type: Number, default: 0 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    latestPayload: { type: Object, default: {} },
    isActive: { type: Boolean, default: true },
    signalStrength: { type: Number, default: null },
    ipAddress: { type: String, default: null },
    macAddress: { type: String, default: null },
    lastTopic: { type: String, default: null },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes
deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeen: 1 });
deviceSchema.index({ createdAt: 1 });

const Device = mongoose.model('Device', deviceSchema);

export default Device;
