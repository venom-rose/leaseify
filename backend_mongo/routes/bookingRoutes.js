const express = require('express');
const router = express.Router();
const { getBookings, createBooking } = require('../controllers/bookingController');

router.route('/')
  .get(getBookings)
  .post(createBooking);

module.exports = router;
