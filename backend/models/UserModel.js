const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'worker'], required: true },
  stationName: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },

  // Readings per fuel + nozzle with opening and closing values
  readings: [
    {
      fuelType: { type: String, enum: ['XG', 'HSD', 'MS'] },
      nozzle: { type: Number, required: true },
      closing: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

// SIGNUP
userSchema.statics.signup = async function ({
  username,
  password,
  role,
  stationName,
  isActive = true,
  readings = [],
  lastLogin = null
}) {
  if (!username || !password || !role || !stationName) {
    throw Error('All fields must be filled!');
  }

  if (!validator.isAlphanumeric(username)) {
    throw Error('Username must only contain letters and numbers (no symbols)');
  }

  const passwordIsValid = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{6,}$/.test(password);
  if (!passwordIsValid) {
    throw Error('Password must include letters, numbers, and symbols (min 6 characters)');
  }

  if (!['admin', 'worker'].includes(role)) {
    throw Error('Invalid role. Role must be admin or worker.');
  }

  if (!validator.isLength(stationName, { min: 2, max: 50 }) || !/^[a-zA-Z\s0-9]+$/.test(stationName)) {
    throw Error('Station name must be 2-50 characters and contain only letters, numbers, and spaces');
  }

  const usernameExists = await this.findOne({ username });
  if (usernameExists) throw Error('Username already in use');

  const stationExists = await this.findOne({ stationName });
  if (stationExists) throw Error('A user is already assigned to this station');

  const allUsers = await this.find({});
  for (let user of allUsers) {
    const match = await bcrypt.compare(password, user.password);
    if (match) throw Error('This password is already in use. Please choose a different one.');
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const newUser = await this.create({
    username,
    password: hash,
    role,
    stationName,
    isActive,
    readings,
    lastLogin
  });

  return newUser;
};

// LOGIN
userSchema.statics.login = async function (username, password) {
  if (!username || !password) {
    throw Error('All fields must be filled!');
  }

  const user = await this.findOne({ username });
  if (!user) throw Error('Incorrect username');

  if (!user.isActive) {
    throw Error('Account is inactive. Please contact administrator.');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw Error('Incorrect password');

  user.lastLogin = new Date();
  await user.save();

  return user;
};

// UPDATE
userSchema.statics.updateUser = async function (id, updates) {
  const { username, password, role, stationName, isActive, readings, lastLogin } = updates;

  const user = await this.findById(id);
  if (!user) throw Error('User not found');

  if (username && !validator.isAlphanumeric(username)) {
    throw Error('Username must only contain letters and numbers (no symbols)');
  }

  if (stationName && (!validator.isLength(stationName, { min: 2, max: 50 }) || !/^[a-zA-Z0-9\s]+$/.test(stationName))) {
    throw Error('Station name must be 2-50 characters and contain only letters, numbers, and spaces');
  }

  if (role && !['admin', 'worker'].includes(role)) {
    throw Error('Invalid role');
  }

  if (username && username !== user.username) {
    const usernameExists = await this.findOne({ username });
    if (usernameExists) throw Error('Username already in use');
  }

  if (stationName && stationName !== user.stationName) {
    const stationExists = await this.findOne({ stationName });
    if (stationExists) throw Error('Station already in use');
  }

  if (password) {
    const allUsers = await this.find({ _id: { $ne: id } });
    for (let u of allUsers) {
      const match = await bcrypt.compare(password, u.password);
      if (match) throw Error('Password already used by another user');
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  if (username) user.username = username;
  if (role) user.role = role;
  if (stationName) user.stationName = stationName;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (Array.isArray(readings)) user.readings = readings;
  if (lastLogin) user.lastLogin = new Date(lastLogin);

  await user.save();
  return user;
};

// DELETE
userSchema.statics.deleteUser = async function (id) {
  const user = await this.findByIdAndDelete(id);
  if (!user) throw Error('User not found');
  return user;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
