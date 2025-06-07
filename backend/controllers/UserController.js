const User = require('../models/UserModel');
const Shift = require('../models/ShiftModel');
const jwt = require('jsonwebtoken');

// JWT token creator
const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Signup controller
const signupUser = async (req, res) => {
  const {
    username,
    password,
    role,
    stationName,
    isActive,
    readings,
    lastLogin
  } = req.body;

  try {
    const user = await User.signup({
      username,
      password,
      role,
      stationName,
      isActive,
      readings,
      lastLogin
    });

    const token = createToken(user._id);

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      stationName: user.stationName,
      isActive: user.isActive,
      readings: user.readings,
      lastLogin: user.lastLogin,
      token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login controller
const loginUser = async (req, res) => {
  const { username, password, adminOverride } = req.body;

  try {
    const user = await User.login(username, password);

    // Check for recent shift submissions for petrol users (workers)
    if (user.role === 'worker' && !adminOverride) {
      // Check for shifts from today (based on shift work date, not submission date)
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      console.log(`🔍 Checking for shifts on date: ${todayStart.toISOString().split('T')[0]}`);

      const recentShift = await Shift.findOne({
        user: user._id,
        date: {
          $gte: todayStart,
          $lt: todayEnd
        }
      }).sort({ date: -1 });

      console.log(`🔍 Recent shift found:`, recentShift ? {
        timeType: recentShift.timeType,
        shiftDate: recentShift.date,
        submittedAt: recentShift.shiftDateSubmitted,
        userId: recentShift.user
      } : 'None');

      if (recentShift) {
        const shiftDateStr = recentShift.date.toISOString().split('T')[0];

        console.log(`⚠️ Login blocked for ${user.username}: Already submitted a ${recentShift.timeType} shift for ${shiftDateStr}`);

        return res.status(403).json({
          error: 'RECENT_SHIFT_WARNING',
          message: `You already submitted a ${recentShift.timeType} shift for ${shiftDateStr}. Please check with admin before logging in again.`,
          shiftDetails: {
            timeType: recentShift.timeType,
            shiftDate: recentShift.date,
            submittedAt: recentShift.shiftDateSubmitted
          },
          requiresAdminOverride: true
        });
      } else {
        console.log(`✅ No shifts found for today for ${user.username}, allowing login`);
      }
    } else if (user.role === 'worker' && adminOverride) {
      console.log(`🔓 Admin override used for ${user.username} login after recent shift`);
    }

    const token = createToken(user._id);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      stationName: user.stationName,
      isActive: user.isActive,
      readings: user.readings,
      lastLogin: user.lastLogin,
      token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update user controller
const updateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedUser = await User.updateUser(id, req.body);
    res.status(200).json({
      _id: updatedUser._id,
      username: updatedUser.username,
      role: updatedUser.role,
      stationName: updatedUser.stationName,
      isActive: updatedUser.isActive,
      readings: updatedUser.readings,
      lastLogin: updatedUser.lastLogin
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete user controller
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.deleteUser(id);
    res.status(200).json({ message: 'User deleted successfully', deletedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all users (no passwords)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

// Get current user readings (for debugging)
const getCurrentUserReadings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({
      userId: user._id,
      username: user.username,
      readings: user.readings || []
    });
  } catch (error) {
    console.error('❌ Error fetching user readings:', error);
    res.status(500).json({ error: 'Failed to fetch user readings.' });
  }
};

module.exports = {
  signupUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getCurrentUserReadings
};
