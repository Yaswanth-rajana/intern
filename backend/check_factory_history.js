import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const sensorHistorySchema = new mongoose.Schema({}, { strict: false, collection: 'sensorhistories' });
const SensorHistory = mongoose.model('SensorHistory', sensorHistorySchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const count = await SensorHistory.countDocuments({ deviceId: 'DEMO-FACTORY-01' });
    console.log('Total history records for DEMO-FACTORY-01:', count);

    const history = await SensorHistory.find({ deviceId: 'DEMO-FACTORY-01' }).sort({ timestamp: -1 }).limit(5);
    console.log('Latest history for DEMO-FACTORY-01:', JSON.stringify(history, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
