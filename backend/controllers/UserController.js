const User = require('../models/UserModel');
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
  const { username, password } = req.body;

  try {
    const user = await User.login(username, password);
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

module.exports = {
  signupUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers
};
