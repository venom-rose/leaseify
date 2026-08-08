const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  updatePaymentStatus,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getPayments)
  .post(createPayment);

router
  .route('/:id/status')
  .put(authorize('admin'), updatePaymentStatus);

module.exports = router;
