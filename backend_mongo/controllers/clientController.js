const Client = require('../models/Client');

// @desc    Get all client profiles
// @route   GET /api/clients
// @access  Public
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create new client profile
// @route   POST /api/clients
// @access  Public
exports.createClient = async (req, res) => {
  try {
    const { name, contact, activeBookings } = req.body;
    const client = await Client.create({
      name,
      contact,
      activeBookings: activeBookings || 0
    });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
