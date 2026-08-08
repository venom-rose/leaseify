const express = require('express');
const router = express.Router();
const {
  createRentalBooking,
  getRentals,
  getRentalById,
  updateRentalStatus,
  processRentalReturn,
  getRentalInvoice,
  getRentalSettings,
  updateRentalSettings,
  triggerOverdueSync,
} = require('../controllers/rentalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getRentals)
  .post(createRentalBooking);

router
  .route('/settings')
  .get(getRentalSettings)
  .put(authorize('admin'), updateRentalSettings);

router
  .route('/sync-overdue')
  .post(authorize('admin'), triggerOverdueSync);

router
  .route('/:id')
  .get(getRentalById);

router
  .route('/:id/status')
  .put(updateRentalStatus);

router
  .route('/:id/return')
  .post(processRentalReturn);

router
  .route('/:id/invoice')
  .get(getRentalInvoice);

module.exports = router;
