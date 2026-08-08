import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Authorization: Bearer <token>

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
      }

      req.user = {
        userId: decoded.userId || decoded.id,
        id: decoded.id || decoded.userId,
        username: decoded.username,
        role: decoded.role,
        tenantId: decoded.tenantId || null,
      };

      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};

// Legacy backward-compatibility middleware (SUPER_ADMIN or CLIENT_ADMIN)
export const requireAdmin = requireRole('SUPER_ADMIN', 'CLIENT_ADMIN');

/**
 * Helper to apply tenant scoping to Mongoose query filters.
 * - SUPER_ADMIN: Can view all tenants, or filter by req.query.tenantId if provided & valid ObjectId.
 * - CLIENT_ADMIN & VIEWER: Always restricted strictly to req.user.tenantId (req.query.tenantId ignored).
 */
export const applyTenantFilter = (req, baseQuery = {}) => {
  if (!req.user) return baseQuery;

  if (req.user.role === 'SUPER_ADMIN') {
    const requestedTenantId = req.query?.tenantId;
    if (requestedTenantId && mongoose.Types.ObjectId.isValid(requestedTenantId)) {
      return { ...baseQuery, tenantId: requestedTenantId };
    }
    return baseQuery;
  }

  // For CLIENT_ADMIN and VIEWER, enforce tenantId strictly from authenticated user context
  return {
    ...baseQuery,
    tenantId: req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null,
  };
};
