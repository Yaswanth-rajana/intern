import mongoose from 'mongoose';

const thresholdSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    sensorKey: {
      type: String,
      required: true,
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

thresholdSchema.index({ tenantId: 1, sensorKey: 1 }, { unique: true });

const Threshold = mongoose.model('Threshold', thresholdSchema);

export default Threshold;
