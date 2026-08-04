import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import dataRouter from './routes/data.js';

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/health', healthRouter);
app.use('/devices', dataRouter);

export default app;
