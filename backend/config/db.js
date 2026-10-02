const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Ensure public DNS resolution for MongoDB Atlas SRV records on Windows
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
