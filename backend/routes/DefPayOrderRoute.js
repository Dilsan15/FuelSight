const express = require('express');
const router = express.Router();

const {
  createDefPayOrder,
  updateDefPayOrder,
  deleteDefPayOrder,
  getDefPayOrder,
  getDefPayOrders
} = require('../controllers/DefPayOrderController');

const requireAuth = require('../middleware/RequireAuth');
const requireAdmin = require('../middleware/RequireAdmin');

// 🔒 Worker OR Admin can submit a new order
router.use(requireAuth);
router.post('/', createDefPayOrder);

// 🔒 Admin-only routes for reading/updating/deleting orders
router.use(requireAdmin);      // ensures user is admin (already authenticated)

router.get('/search', getDefPayOrders);
router.get('/:id', getDefPayOrder);
router.patch('/:id', updateDefPayOrder);
router.delete('/:id', deleteDefPayOrder);

module.exports = router;
