import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    role: { type: String, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE_TENANT',
        'UPDATE_TENANT',
        'DELETE_TENANT',
        'CREATE_USER',
        'DELETE_USER',
        'REGISTER_DEVICE',
        'ASSIGN_DEVICE',
        'REASSIGN_DEVICE',
        'UNASSIGN_DEVICE',
        'UPDATE_DEVICE_LOCATION',
        'UPDATE_THRESHOLD',
        'ASSIGN_VIEWER_DEVICES',
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
      ],
    },
    resource: { type: String, required: true },
    resourceId: { type: String, default: null },
    metadata: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ username: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export const logAudit = async ({ req, action, resource, resourceId = null, metadata = {} }) => {
  try {
    const user = req?.user;
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null;

    await AuditLog.create({
      userId: user?.id || user?.userId || null,
      username: user?.username || metadata?.username || 'anonymous',
      role: user?.role || 'GUEST',
      tenantId: user?.tenantId || null,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      metadata,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
};

export default AuditLog;
