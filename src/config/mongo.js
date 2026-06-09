const mongoose = require('mongoose');

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri, {
    readPreference: 'primary',
    w: 'majority',
    journal: true,
  });
  console.log('✅ MongoDB connected (replica set)');
}

module.exports = { connectMongo };
