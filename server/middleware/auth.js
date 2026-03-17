const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'match-energy-secret';

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, access denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid' });
  }
};
