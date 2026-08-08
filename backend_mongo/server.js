const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const productRoutes = require('./routes/productRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const clientRoutes = require('./routes/clientRoutes');

// Model imports (for demo seed helper)
const User = require('./models/User');
const Product = require('./models/Product');
const Booking = require('./models/Booking');
const Client = require('./models/Client');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Express Middleware
app.use(cors());
app.use(express.json());

// API Route Mounts
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/clients', clientRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Leaseify MongoDB Backend',
    timestamp: new Date()
  });
});

// Demo Data Seeder Endpoint (POST /api/seed)
app.post('/api/seed', async (req, res) => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Booking.deleteMany();
    await Client.deleteMany();

    const user = await User.create({
      name: 'Sarah Connor',
      email: 'sarah.c@leaseify.io',
      role: 'admin'
    });

    const product1 = await Product.create({
      name: 'MacBook Pro 16" M3 Max',
      category: 'Electronics',
      pricePerDay: 45,
      availability: true
    });

    const product2 = await Product.create({
      name: 'Sony Alpha A7 IV 4K Camera',
      category: 'Electronics',
      pricePerDay: 35,
      availability: true
    });

    const booking = await Booking.create({
      userId: user._id,
      productId: product1._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    });

    const client = await Client.create({
      name: 'Alex Rivera',
      contact: '+1 (555) 432-8765',
      activeBookings: 1
    });

    res.status(201).json({
      success: true,
      message: 'MongoDB Demo Database seeded successfully!',
      data: { user, products: [product1, product2], booking, client }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Leaseify MongoDB Backend Server running on port ${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
