const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const requireAdmin = require('../middleware/RequireAdmin');

const {
  createDayRate,
  updateDayRate,
  deleteDayRate,
  getLatestDayRate,
  getDayRatesWithFilters
} = require('../controllers/DayRateController');


router.use(requireAuth)
router.get('/latest', getLatestDayRate);
router.get('/search', getDayRatesWithFilters);    


router.use(requireAuth)
router.use(requireAdmin)
router.post('/create', createDayRate);
router.put('/update/:id', updateDayRate);
router.delete('/delete/:id', deleteDayRate);
  // Get with pagination and/or date filters


module.exports = router;
