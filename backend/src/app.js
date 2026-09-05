import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import dataRouter from './routes/data.js';
import authRouter from './routes/auth.js';
import thresholdsRouter from './routes/thresholds.js';
import tenantsRouter from './routes/tenants.js';
import auditLogsRouter from './routes/auditLogs.js';
import readingsRouter from './routes/readings.js';
import superadminDevicesRouter from './routes/superadminDevices.js';

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/health', healthRouter);
app.use('/devices', dataRouter);
app.use('/auth', authRouter);
app.use('/api/users', authRouter);
app.use('/thresholds', thresholdsRouter);
app.use('/tenants', tenantsRouter);
app.use('/audit-logs', auditLogsRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/superadmin/devices', superadminDevicesRouter);

export default app;
