const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const {
  submitShift,
  updateShift,
  deleteShift,
  getShifts,
  getShift,
  synchronizeReadings
} = require('../controllers/ShiftController');

const requireAdmin = require('../middleware/RequireAdmin')

router.use(requireAuth);

router.post('/submit', submitShift);
router.post('/synchronize-readings', synchronizeReadings); // For current user
router.post('/synchronize-readings/:userId', synchronizeReadings); // For admin use with specific user

router.use(requireAuth)
router.use(requireAdmin)

router.patch('/update/:id', updateShift);
router.delete('/delete/:id', deleteShift);
router.get('/search', getShifts);     // Get with pagination and/or date filters
router.get('/:id', getShift)
module.exports = router;
