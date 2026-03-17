const express = require('express');
const router = express.Router();
const Appliance = require('../models/Appliance');
const auth = require('../middleware/auth');

// GET /api/appliances — get all for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const appliances = await Appliance.find({ user: req.user.id, isActive: true }).sort('-createdAt');
    res.json(appliances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appliances — create
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, wattage, hoursPerDay } = req.body;
    if (!name || !wattage || !hoursPerDay) return res.status(400).json({ error: 'name, wattage, and hoursPerDay are required' });
    const appliance = await Appliance.create({ user: req.user.id, name, type, wattage, hoursPerDay });
    res.status(201).json(appliance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appliances/:id — update
router.put('/:id', auth, async (req, res) => {
  try {
    const appliance = await Appliance.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!appliance) return res.status(404).json({ error: 'Not found' });
    res.json(appliance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appliances/:id — soft delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const appliance = await Appliance.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isActive: false },
      { new: true }
    );
    if (!appliance) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appliances/summary — dashboard stats
router.get('/summary', auth, async (req, res) => {
  try {
    const appliances = await Appliance.find({ user: req.user.id, isActive: true });
    const totalDailyKwh = appliances.reduce((sum, a) => sum + a.dailyKwh, 0);
    const totalMonthlyKwh = totalDailyKwh * 30;
    const byType = {};
    appliances.forEach(a => {
      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type] += a.monthlyKwh;
    });
    res.json({ totalDailyKwh, totalMonthlyKwh, byType, count: appliances.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
