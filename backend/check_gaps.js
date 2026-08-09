import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://yaswanthrajanaindiann_db_user:k7re37vtH3QtGlt1@cluster0.b0ijpeb.mongodb.net/?appName=Cluster0';

const sensorHistorySchema = new mongoose.Schema({}, { strict: false, collection: 'sensorhistories' });
const SensorHistory = mongoose.model('SensorHistory', sensorHistorySchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const history = await SensorHistory.find({ deviceId: 'DEMO-FACTORY-01' }).sort({ timestamp: 1 });
    console.log(`Found ${history.length} records. Timestamps (Chronological):`);
    
    for (let i = 0; i < history.length; i++) {
      const ts = new Date(history[i].timestamp);
      const localStr = ts.toLocaleTimeString();
      let diffStr = '';
      if (i > 0) {
        const prev = new Date(history[i-1].timestamp);
        const diffMs = ts.getTime() - prev.getTime();
        diffStr = `(+${(diffMs / 1000).toFixed(1)}s)`;
      }
      console.log(`[${i}] ISO: ${history[i].timestamp} | Local: ${localStr} ${diffStr}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
