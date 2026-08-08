const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/leaseify_rental_db';
    const conn = await mongoose.connect(connStr, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // Non-fatal exit for local demo flexibility
  }
};

module.exports = connectDB;
