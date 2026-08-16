import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Device from '../models/Device.js';
import SensorHistory from '../models/SensorHistory.js';
import SensorReading from '../models/SensorReading.js';
import Threshold from '../models/Threshold.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iaq_monitoring';

const DEFAULT_SENSOR_LIMITS = [
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

/**
 * Seeds default sensor threshold parameters for a specific tenant if they do not exist yet.
 */
export const seedTenantThresholds = async (tenantId) => {
  if (!tenantId) return;
  try {
    for (const item of DEFAULT_SENSOR_LIMITS) {
      await Threshold.updateOne(
        { tenantId, sensorKey: item.sensorKey },
        {
          $setOnInsert: {
            tenantId,
            sensorKey: item.sensorKey,
            warningLimit: item.warningLimit,
            criticalLimit: item.criticalLimit,
          }
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error(`Failed to seed thresholds for tenant ${tenantId}:`, err.message);
  }
};

const seedDatabase = async () => {
  try {
    console.log('[Database Migration] Running Phase 3 multi-tenant threshold migration...');

    // Drop old single-field sensorKey index if present and sync compound index
    await Threshold.syncIndexes();

    // 1. Ensure Default Tenant exists
    let defaultTenant = await Tenant.findOne({ slug: 'default-tenant' });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: 'Default Tenant',
        slug: 'default-tenant',
        status: 'active',
      });
      console.log('✓ Seeded Default Tenant (slug: default-tenant)');
    }

    // 2. Migrate / Seed Default Users
    await User.updateMany({ role: 'Admin' }, { $set: { role: 'SUPER_ADMIN', tenantId: null } });
    await User.updateMany(
      { $or: [{ role: 'Viewer' }, { role: 'VIEWER' }], tenantId: null },
      { $set: { role: 'VIEWER', tenantId: defaultTenant._id } }
    );

    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      adminUser = await User.create({
        username: 'admin',
        password: adminPasswordHash,
        role: 'SUPER_ADMIN',
        tenantId: null,
      });
      console.log('✓ Created default admin user (admin / admin123, role: SUPER_ADMIN)');
    } else if (adminUser.role !== 'SUPER_ADMIN') {
      adminUser.role = 'SUPER_ADMIN';
      adminUser.tenantId = null;
      await adminUser.save();
    }

    let viewerUser = await User.findOne({ username: 'viewer' });
    if (!viewerUser) {
      const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
      viewerUser = await User.create({
        username: 'viewer',
        password: viewerPasswordHash,
        role: 'VIEWER',
        tenantId: defaultTenant._id,
      });
      console.log('✓ Created default viewer user (viewer / viewer123, role: VIEWER)');
    }

    // 3. Sensor History tenant backfill
    const assignedDevices = await Device.find({ tenantId: { $ne: null } }).lean();
    for (const d of assignedDevices) {
      await SensorHistory.updateMany(
        { deviceId: d.deviceId, tenantId: null },
        { $set: { tenantId: d.tenantId } }
      );
    }

    // 4. Threshold Migration: assign unlinked legacy global thresholds (tenantId: null) to defaultTenant
    await Threshold.updateMany({ tenantId: null }, { $set: { tenantId: defaultTenant._id } });

    // Ensure all registered tenants have populated thresholds
    const allTenants = await Tenant.find({}).lean();
    for (const t of allTenants) {
      await seedTenantThresholds(t._id);
    }

    // 5. Ensure Default Demo Devices exist
    const demoDevices = [
      {
        deviceId: 'DEMO-OFFICE-01',
        name: 'Main Office',
        firmwareVersion: '1.2.3',
        hardwareVersion: 'T113i-RevA',
        location: 'Main Office',
        status: 'UNASSIGNED',
        tenantId: null
      },
      {
        deviceId: 'DEMO-OFFICE-02',
        name: 'Conference Room',
        firmwareVersion: '1.2.1',
        hardwareVersion: 'T113i-RevB',
        location: 'Conference Room',
        status: 'UNASSIGNED',
        tenantId: null
      },
      {
        deviceId: 'DEMO-FACTORY-01',
        name: 'Main Factory',
        firmwareVersion: '1.3.0',
        hardwareVersion: 'T113i-RevC',
        location: 'Main Factory',
        status: 'UNASSIGNED',
        tenantId: null
      }
    ];

    for (const dev of demoDevices) {
      const existingDev = await Device.findOne({ deviceId: dev.deviceId });
      if (!existingDev) {
        await Device.create(dev);
        console.log(`✓ Seeded Demo Device: ${dev.deviceId}`);
      }
    }

    console.log('✓ Phase 3 multi-tenant threshold migration check completed cleanly');
  } catch (error) {
    console.error('✗ Database Seeder failed:', error.message);
  }
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    await seedDatabase();
  } catch (error) {
    console.error(`✗ MongoDB Connection Failed: ${error.message}`);
    setTimeout(connectDB, 5000);
  }
};
