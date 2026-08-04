import mongoose from 'mongoose';

const alarmSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

alarmSchema.index({ deviceId: 1, createdAt: -1 });
alarmSchema.index({ resolvedAt: 1 });

const Alarm = mongoose.model('Alarm', alarmSchema);

export default Alarm;
