const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'match-energy-secret';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, location, ratePerKwh } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      location: location || 'US Average',
      ratePerKwh: ratePerKwh || 0.13
    });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, location: user.location, ratePerKwh: user.ratePerKwh, goalType: user.goalType, goalValue: user.goalValue } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, location: user.location, ratePerKwh: user.ratePerKwh, goalType: user.goalType, goalValue: user.goalValue } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/rate
router.put('/rate', authMiddleware, async (req, res) => {
  try {
    const { ratePerKwh } = req.body;
    const rate = parseFloat(ratePerKwh);
    if (isNaN(rate) || rate <= 0 || rate > 5) {
      return res.status(400).json({ error: 'Rate must be between $0.01 and $5.00 per kWh' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ratePerKwh: rate },
      { new: true }
    ).select('-password');
    res.json({ user: { id: user._id, email: user.email, location: user.location, ratePerKwh: user.ratePerKwh, goalType: user.goalType, goalValue: user.goalValue } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/goal
router.put('/goal', authMiddleware, async (req, res) => {
  try {
    const { goalType, goalValue } = req.body;
    if (!['kwh', 'cost'].includes(goalType)) {
      return res.status(400).json({ error: 'goalType must be kwh or cost' });
    }
    const val = parseFloat(goalValue);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'goalValue must be a positive number' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { goalType, goalValue: val },
      { new: true }
    ).select('-password');
    res.json({ user: { id: user._id, email: user.email, location: user.location, ratePerKwh: user.ratePerKwh, goalType: user.goalType, goalValue: user.goalValue } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
