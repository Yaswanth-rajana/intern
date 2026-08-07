import mongoose from 'mongoose';

const thresholdSchema = new mongoose.Schema(
  {
    sensorKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    warningLimit: {
      type: Number,
      required: true,
    },
    criticalLimit: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

thresholdSchema.index({ sensorKey: 1 });

const Threshold = mongoose.model('Threshold', thresholdSchema);

export default Threshold;
