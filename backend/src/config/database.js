import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Threshold from '../models/Threshold.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iaq_monitoring';

const seedDatabase = async () => {
  try {
    // 1. Seed Users
    // Clear user table to ensure clean seeding of the renamed Viewer role
    await User.deleteMany({});
    console.log('[Database Seeder] Seeding default users...');
    
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
    
    await User.insertMany([
      { username: 'admin', password: adminPasswordHash, role: 'Admin' },
      { username: 'viewer', password: viewerPasswordHash, role: 'Viewer' }
    ]);
    
    console.log('✓ Default users seeded: admin/admin123 and viewer/viewer123');

    // 2. Seed Thresholds
    const thresholdCount = await Threshold.countDocuments();
    if (thresholdCount === 0) {
      console.log('[Database Seeder] Seeding default thresholds...');
      
      const defaultThresholds = [
        { sensorKey: 'AQI', warningLimit: 50, criticalLimit: 200 },
        { sensorKey: 'CO2', warningLimit: 800, criticalLimit: 1800 },
        { sensorKey: 'VOC', warningLimit: 150, criticalLimit: 660 },
        { sensorKey: 'PM1_0', warningLimit: 25, criticalLimit: 100 },
        { sensorKey: 'PM2_5', warningLimit: 35, criticalLimit: 150 },
        { sensorKey: 'PM4_0', warningLimit: 40, criticalLimit: 150 },
        { sensorKey: 'PM10', warningLimit: 100, criticalLimit: 350 },
        { sensorKey: 'Temperature', warningLimit: 30, criticalLimit: 35 },
        { sensorKey: 'Humidity', warningLimit: 70, criticalLimit: 80 },
        { sensorKey: 'NOX', warningLimit: 100, criticalLimit: 300 }
      ];

      await Threshold.insertMany(defaultThresholds);
      console.log('✓ Default thresholds seeded successfully');
    }
  } catch (error) {
    console.error('✗ Database Seeder failed:', error.message);
  }
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    // Run seed function after connection
    await seedDatabase();
  } catch (error) {
    console.error(`✗ MongoDB Connection Failed: ${error.message}`);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

