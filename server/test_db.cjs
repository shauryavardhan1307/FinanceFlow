require('dotenv').config();
const mongoose = require('mongoose');

const stdUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_management';

async function testConnection() {
  try {
    console.log('Testing Direct URI...');
    await mongoose.connect(stdUri, { serverSelectionTimeoutMS: 5000, family: 4 });
    console.log('✅ Direct URI connection SUCCESS!');
    await mongoose.disconnect();
  } catch (err) {
    console.log(`❌ Direct URI connection FAILED: ${err.message}`);
  }
}

testConnection().then(() => process.exit(0));
