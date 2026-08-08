const express = require('express');
const router = express.Router();
const {
  createRentalBooking,
  getRentals,
  getRentalById,
  updateRentalStatus,
  schedulePickup,
  markAsPicked,
  processRentalReturn,
  verifyQRToken,
  sendReminderEmail,
  getPredictionsAndAvailability,
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
  .route('/predictions')
  .get(getPredictionsAndAvailability);

router
  .route('/:id')
  .get(getRentalById);

router
  .route('/:id/status')
  .put(updateRentalStatus);

router
  .route('/:id/schedule-pickup')
  .post(schedulePickup);

router
  .route('/:id/mark-picked')
  .post(markAsPicked);

router
  .route('/:id/return')
  .post(processRentalReturn);

router
  .route('/:id/verify-qr')
  .post(verifyQRToken);

router
  .route('/:id/send-reminder')
  .post(sendReminderEmail);

router
  .route('/:id/invoice')
  .get(getRentalInvoice);

module.exports = router;
