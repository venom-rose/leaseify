require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Leaseify Backend Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
      console.warn(`💡 Solution: Stop the existing backend server process, or free port ${PORT} using:\n   Windows: netstat -ano | findstr :${PORT}  (then: taskkill /F /PID <pid>)\n   Mac/Linux: kill -9 $(lsof -ti :${PORT})\n`);
      process.exit(1);
    } else {
      console.error('[Server Error]:', err);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection]: ${err.message}`);
  });

  // Graceful termination
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received. Closing gracefully...');
    server.close(() => process.exit(0));
  });
};

startServer();
