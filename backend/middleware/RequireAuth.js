const jwt = require('jsonwebtoken');
const User = require('../models/UserModel'); // adjust path if your file name is different

const requireAuth = async (req, res, next) => {

  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authorization.split(' ')[1];

  try {
    const { _id } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ _id }).select('_id username role stationName isActive');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
    }

    req.user = user;
    next();
    
  } catch (error) {

    console.log(error);
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

module.exports = requireAuth;
