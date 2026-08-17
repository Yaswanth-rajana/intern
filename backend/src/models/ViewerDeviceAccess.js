import mongoose from 'mongoose';

const viewerDeviceAccessSchema = new mongoose.Schema(
  {
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignments
viewerDeviceAccessSchema.index({ viewerId: 1, deviceId: 1 }, { unique: true });
viewerDeviceAccessSchema.index({ tenantId: 1 });
viewerDeviceAccessSchema.index({ viewerId: 1 });
viewerDeviceAccessSchema.index({ deviceId: 1 });

const ViewerDeviceAccess = mongoose.model('ViewerDeviceAccess', viewerDeviceAccessSchema);

export default ViewerDeviceAccess;
