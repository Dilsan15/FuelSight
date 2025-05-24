const express = require('express');
const router = express.Router();

const {
  createDefPayAccount,
  updateDefPayAccount,
  deleteDefPayAccount,
  getDefPayAccounts,
  getDefPayAccount
} = require('../controllers/DefPayAccountController');
const requireAdmin = require('../middleware/RequireAdmin');
const requireAuth = require('../middleware/RequireAuth');



router.use(requireAuth)
router.get('/search', getDefPayAccounts)
router.get('/:id', getDefPayAccount)

router.use(requireAuth)
router.use(requireAdmin)

router.post('/create', createDefPayAccount);
router.put('/update/:id', updateDefPayAccount);
router.delete('/delete/:id', deleteDefPayAccount);


module.exports = router;
