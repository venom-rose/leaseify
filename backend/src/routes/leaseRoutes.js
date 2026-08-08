const express = require('express');
const router = express.Router();
const {
  getLeases,
  getLeaseById,
  createLease,
  updateLease,
} = require('../controllers/leaseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getLeases)
  .post(authorize('admin'), createLease);

router
  .route('/:id')
  .get(getLeaseById)
  .put(authorize('admin'), updateLease);

module.exports = router;
