import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const sensorHistorySchema = new mongoose.Schema({}, { strict: false, collection: 'sensorhistories' });
const SensorHistory = mongoose.model('SensorHistory', sensorHistorySchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const missingRawPayloadCount = await SensorHistory.countDocuments({ rawPayload: { $exists: false } });
    console.log('Total history records missing rawPayload:', missingRawPayloadCount);

    const nullRawPayloadCount = await SensorHistory.countDocuments({ rawPayload: null });
    console.log('Total history records with null rawPayload:', nullRawPayloadCount);

    const sample = await SensorHistory.findOne({ rawPayload: { $exists: false } });
    if (sample) {
      console.log('Sample document missing rawPayload:', JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
