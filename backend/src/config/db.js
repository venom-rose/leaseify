const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://debjeet-kundu:debjeet%4014072022@leaseify.wnloexf.mongodb.net/?appName=Leaseify', {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.warn('[MongoDB] Running in offline/disconnected database mode. Ensure MongoDB is running on port 27017 or provide a valid MONGO_URI in .env');
  }
};

module.exports = connectDB;
