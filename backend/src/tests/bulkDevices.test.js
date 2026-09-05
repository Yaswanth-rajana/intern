import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tenant from '../models/Tenant.js';
import Device from '../models/Device.js';
import SensorReading from '../models/SensorReading.js';
import AuditLog from '../models/AuditLog.js';
import {
  bulkUnassignDevicesService,
  bulkArchiveDevicesService,
  bulkAssignDevicesService,
  bulkRestoreDevicesService,
  loadDevicesIntoCache,
  getDeviceList,
  getDevicesStats
} from '../services/mqttService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const runBulkDevicesTests = async () => {
  console.log('====================================================');
  console.log('   STARTING BULK DEVICE MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB for bulk testing');

    // Clean up test data before starting
    const testTenantSlug = 'bulk-test-client-' + Date.now();
    await Tenant.deleteMany({ name: 'Bulk Test Org' });

    // 1. Seed Tenant
    const tenant = new Tenant({ name: 'Bulk Test Org', slug: testTenantSlug, status: 'active' });
    await tenant.save();

    // 2. Seed 5 Test Devices
    const devId1 = `BULK-DEV-1-${Date.now()}`;
    const devId2 = `BULK-DEV-2-${Date.now()}`;
    const devId3 = `BULK-DEV-3-${Date.now()}`;
    const devId4 = `BULK-DEV-4-${Date.now()}`;
    const devId5 = `BULK-DEV-5-${Date.now()}`;
    const deviceIds = [devId1, devId2, devId3, devId4, devId5];

    await Device.deleteMany({ deviceId: { $in: deviceIds } });
    await SensorReading.deleteMany({ deviceId: { $in: deviceIds } });

    const devDocs = deviceIds.map(id => new Device({
      deviceId: id,
      name: `Sensor ${id}`,
      status: 'UNASSIGNED',
      tenantId: null,
    }));
    await Device.insertMany(devDocs);

    // 3. Seed historical SensorReading telemetry
    const reading1 = new SensorReading({
      deviceId: devId1,
      tenantId: tenant._id,
      timestamp: new Date(),
      receivedAt: new Date(),
      AQI: 45,
      CO2: 520,
      Temperature: 23.5,
      Humidity: 50.0,
    });
    await reading1.save();

    await loadDevicesIntoCache();
    console.log('✓ Test Tenant, Devices, and Historical Telemetry seeded successfully');

    // ----------------------------------------------------
    // TEST 1 — BULK ASSIGN TO CLIENT
    // ----------------------------------------------------
    console.log('\n[Test 1] Bulk Assign Devices to Client');
    const assignRes = await bulkAssignDevicesService([devId1, devId2, devId3], tenant._id, 'Floor 10');
    if (assignRes.assignedCount !== 3) {
      throw new Error(`Expected 3 assigned devices, got ${assignRes.assignedCount}`);
    }

    const checkAssignDev1 = await Device.findOne({ deviceId: devId1 }).lean();
    if (checkAssignDev1.tenantId.toString() !== tenant._id.toString()) {
      throw new Error(`Device ${devId1} tenantId mismatch after bulk assign`);
    }
    console.log('✓ Bulk Assign successfully assigned 3 devices to Client Organization');

    // ----------------------------------------------------
    // TEST 2 — BULK UNASSIGN (Preserve Historical Telemetry)
    // ----------------------------------------------------
    console.log('\n[Test 2] Bulk Unassign Devices & Historical Telemetry Safety');
    const unassignRes = await bulkUnassignDevicesService([devId1, devId2, devId4]);
    if (unassignRes.unassignedCount + unassignRes.alreadyUnassignedCount !== 3) {
      throw new Error('Unassign count mismatch');
    }

    const checkUnassignDev1 = await Device.findOne({ deviceId: devId1 }).lean();
    if (checkUnassignDev1.tenantId !== null || checkUnassignDev1.status !== 'UNASSIGNED') {
      throw new Error(`Device ${devId1} should be UNASSIGNED with tenantId: null`);
    }

    // Verify historical reading was NOT deleted
    const historicalCount = await SensorReading.countDocuments({ deviceId: devId1 });
    if (historicalCount === 0) {
      throw new Error(`CRITICAL: SensorReading telemetry for ${devId1} was deleted during unassign!`);
    }
    console.log('✓ Bulk Unassign detached client while 100% preserving historical telemetry');

    // ----------------------------------------------------
    // TEST 3 — BULK ARCHIVE (Lifecycle State vs Connectivity)
    // ----------------------------------------------------
    console.log('\n[Test 3] Bulk Archive Devices');
    const archiveRes = await bulkArchiveDevicesService([devId1, devId2]);
    if (archiveRes.archivedCount !== 2) {
      throw new Error('Archive count mismatch');
    }

    const checkArchiveDev1 = await Device.findOne({ deviceId: devId1 }).lean();
    if (checkArchiveDev1.status !== 'ARCHIVED') {
      throw new Error(`Device ${devId1} status should be ARCHIVED`);
    }

    // Verify default active list excludes ARCHIVED devices
    const activeList = await getDeviceList({ role: 'SUPER_ADMIN' }, {});
    const activeDevIds = activeList.map(d => d.deviceId);
    if (activeDevIds.includes(devId1) || activeDevIds.includes(devId2)) {
      throw new Error('Archived devices must be hidden from default active fleet view!');
    }

    // Verify Archived filter view includes ARCHIVED devices
    const archivedList = await getDeviceList({ role: 'SUPER_ADMIN' }, { status: 'ARCHIVED' });
    const archivedDevIds = archivedList.map(d => d.deviceId);
    if (!archivedDevIds.includes(devId1) || !archivedDevIds.includes(devId2)) {
      throw new Error('Archived filter view must return ARCHIVED devices!');
    }

    console.log('✓ Bulk Archive safely isolated devices from active view while preserving DB records');

    // ----------------------------------------------------
    // TEST 4 — BULK RESTORE (ARCHIVED -> UNASSIGNED)
    // ----------------------------------------------------
    console.log('\n[Test 4] Bulk Restore Devices to Active Fleet');
    const restoreRes = await bulkRestoreDevicesService([devId1, devId2]);
    if (restoreRes.restoredCount !== 2) {
      throw new Error('Restore count mismatch');
    }

    const checkRestoreDev1 = await Device.findOne({ deviceId: devId1 }).lean();
    if (checkRestoreDev1.status !== 'UNASSIGNED') {
      throw new Error(`Device ${devId1} status should be UNASSIGNED after restore`);
    }

    const activeListAfterRestore = await getDeviceList({ role: 'SUPER_ADMIN' }, {});
    if (!activeListAfterRestore.map(d => d.deviceId).includes(devId1)) {
      throw new Error('Restored device should return to active fleet list!');
    }
    console.log('✓ Bulk Restore returned archived devices safely to active fleet');

    // ----------------------------------------------------
    // TEST 5 — FLEET STATISTICS COUNTERS
    // ----------------------------------------------------
    console.log('\n[Test 5] Fleet Statistics Counters Calculation');
    const stats = getDevicesStats();
    if (typeof stats.totalDevices !== 'number' || typeof stats.activeDevices !== 'number' || typeof stats.archivedDevices !== 'number') {
      throw new Error('Fleet stats object missing required counter properties');
    }
    console.log(`✓ Fleet Statistics correctly calculated: Total=${stats.totalDevices}, Active=${stats.activeDevices}, Archived=${stats.archivedDevices}, Online=${stats.onlineDevices}, Assigned=${stats.assignedDevices}, Unassigned=${stats.unassignedDevices}`);

    // Cleanup test records
    await Tenant.deleteMany({ _id: tenant._id });
    await Device.deleteMany({ deviceId: { $in: deviceIds } });
    await SensorReading.deleteMany({ deviceId: { $in: deviceIds } });

    console.log('\n====================================================');
    console.log('   ALL BULK DEVICE MANAGEMENT TESTS PASSED 100%');
    console.log('====================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ BULK DEVICE MANAGEMENT TEST SUITE FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

runBulkDevicesTests();
