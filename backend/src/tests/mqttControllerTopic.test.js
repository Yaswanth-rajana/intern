import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mqttTopic } from '../config/mqtt.js';
import Device from '../models/Device.js';
import Tenant from '../models/Tenant.js';
import { registerDeviceInCache, getLatestPayload } from '../services/mqttService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const runMqttTopicTests = async () => {
  console.log('====================================================');
  console.log('   STARTING MQTT CONTROLLER TOPIC TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Verify Subscribed Topics
    console.log('Test 1: Verifying subscribed MQTT topics configuration...');
    const expectedTopics = ['iaq/device/#', 'iaq/devices/#', 'iaq/controller/data'];
    console.log('Current mqttTopic config:', mqttTopic);
    
    expectedTopics.forEach(topic => {
      if (!mqttTopic.includes(topic)) {
        throw new Error(`Expected topic "${topic}" to be included in mqttTopic configuration`);
      }
    });
    console.log('✓ All expected MQTT topics configured successfully.\n');

    // 2. Database Connection & Setup
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const testTenantSlug = 'mqtt-test-tenant-' + Date.now();
    await Tenant.deleteMany({ name: 'MQTT Test Org' });
    const tenant = new Tenant({ name: 'MQTT Test Org', slug: testTenantSlug, status: 'active' });
    await tenant.save();

    const testDeviceId = `IAQ-CTRL-${Date.now()}`;
    await Device.deleteMany({ deviceId: testDeviceId });
    const device = new Device({
      deviceId: testDeviceId,
      name: 'Controller Test Device',
      tenantId: tenant._id,
      status: 'ONLINE',
      type: 'IAQ_CONTROLLER'
    });
    await device.save();

    registerDeviceInCache(device.toObject());
    console.log(`✓ Seeded test device: ${testDeviceId}`);

    console.log('\n====================================================');
    console.log('   ALL MQTT CONTROLLER TOPIC TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ MQTT Topic Test Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  }
};

runMqttTopicTests();
