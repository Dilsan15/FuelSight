const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next(); // user is admin
  }

  return res.status(403).json({ error: 'Access denied. Admins only.' });
};

module.exports = requireAdmin;
