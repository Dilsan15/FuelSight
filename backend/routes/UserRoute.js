const express = require('express');
const {
  loginUser,
  signupUser,
  updateUser,
  deleteUser,
  getAllUsers
} = require('../controllers/UserController');


const requireAdmin = require('../middleware/RequireAdmin');
const requireAuth = require('../middleware/RequireAuth');

const router = express.Router();

// Public routes
router.post('/login', loginUser);

router.use(requireAuth)
router.use(requireAdmin)

router.post('/signup', signupUser);


// Update user by ID
router.put('/:id', updateUser);

// Delete user by ID
router.delete('/:id', deleteUser);

router.get('/all', getAllUsers)

module.exports = router;
