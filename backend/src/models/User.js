import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'CLIENT_ADMIN', 'VIEWER'],
      default: 'VIEWER',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 });
userSchema.index({ tenantId: 1 });

const User = mongoose.model('User', userSchema);

export default User;
