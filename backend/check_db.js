import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const sensorHistorySchema = new mongoose.Schema({}, { strict: false, collection: 'sensorhistories' });
const SensorHistory = mongoose.model('SensorHistory', sensorHistorySchema);

const deviceSchema = new mongoose.Schema({}, { strict: false, collection: 'devices' });
const Device = mongoose.model('Device', deviceSchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const devices = await Device.find({});
    console.log('Devices:', JSON.stringify(devices, null, 2));

    const history = await SensorHistory.find({ deviceId: 'DEMO-OFFICE-01' }).sort({ timestamp: -1 }).limit(5);
    console.log('Latest history for DEMO-OFFICE-01:', JSON.stringify(history, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
