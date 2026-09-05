import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: null },
    firmwareVersion: { type: String, default: 'Unknown' },
    hardwareVersion: { type: String, default: 'Unknown' },
    location: { type: String, default: 'Unknown' },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'UNASSIGNED', 'WARNING', 'ARCHIVED'],
      default: 'UNASSIGNED',
    },
    messageCount: { type: Number, default: 0 },
    packetsToday: { type: Number, default: 0 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastTelemetryAt: { type: Date, default: null },
    registeredAt: { type: Date, default: Date.now },
    latestPayload: { type: Object, default: {} },
    isActive: { type: Boolean, default: true },
    signalStrength: { type: Number, default: null },
    ipAddress: { type: String, default: null },
    macAddress: { type: String, default: null },
    lastTopic: { type: String, default: null },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeenAt: -1 });
deviceSchema.index({ createdAt: 1 });
deviceSchema.index({ tenantId: 1 });
deviceSchema.index({ tenantId: 1, status: 1 });
deviceSchema.index({ tenantId: 1, lastSeenAt: -1 });

const Device = mongoose.model('Device', deviceSchema);

export default Device;
