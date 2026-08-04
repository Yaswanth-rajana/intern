import mongoose from 'mongoose';

const systemStatsSchema = new mongoose.Schema(
  {
    totalMessages: { type: Number, default: 0 },
    todayMessages: { type: Number, default: 0 },
    activeDevices: { type: Number, default: 0 },
    lastPacketTime: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const SystemStats = mongoose.model('SystemStats', systemStatsSchema);

export default SystemStats;
