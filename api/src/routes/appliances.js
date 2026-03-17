const router = require('express').Router();
const auth = require('../middleware/auth');
const Appliance = require('../models/Appliance');

// GET /api/appliances - list all for user
router.get('/', auth, async (req, res) => {
  try {
    const appliances = await Appliance.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(appliances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appliances - create
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, wattage, dailyHours, notes } = req.body;
    if (!name || !wattage || dailyHours === undefined) {
      return res.status(400).json({ error: 'name, wattage, and dailyHours are required' });
    }
    const appliance = await Appliance.create({
      user: req.user._id, name, type, wattage, dailyHours, notes,
      usageHistory: [{ dailyHours }]
    });
    res.status(201).json(appliance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appliances/:id - update
router.put('/:id', auth, async (req, res) => {
  try {
    const appliance = await Appliance.findOne({ _id: req.params.id, user: req.user._id });
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

    const { name, type, wattage, dailyHours, notes, active } = req.body;

    // Track hours history if changed
    if (dailyHours !== undefined && dailyHours !== appliance.dailyHours) {
      appliance.usageHistory.push({ dailyHours });
    }

    if (name !== undefined) appliance.name = name;
    if (type !== undefined) appliance.type = type;
    if (wattage !== undefined) appliance.wattage = wattage;
    if (dailyHours !== undefined) appliance.dailyHours = dailyHours;
    if (notes !== undefined) appliance.notes = notes;
    if (active !== undefined) appliance.active = active;

    await appliance.save();
    res.json(appliance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appliances/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const appliance = await Appliance.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appliances/summary - dashboard totals
router.get('/summary', auth, async (req, res) => {
  try {
    const appliances = await Appliance.find({ user: req.user._id, active: true });
    const rate = req.user.electricityRate || 0.13;

    const totalDailyKwh = appliances.reduce((sum, a) => sum + a.dailyKwh, 0);
    const totalMonthlyKwh = totalDailyKwh * 30;
    const totalMonthlyCost = totalMonthlyKwh * rate;

    const byType = {};
    appliances.forEach(a => {
      if (!byType[a.type]) byType[a.type] = { kwh: 0, count: 0 };
      byType[a.type].kwh += a.monthlyKwh;
      byType[a.type].count += 1;
    });

    res.json({
      totalDailyKwh: +totalDailyKwh.toFixed(2),
      totalMonthlyKwh: +totalMonthlyKwh.toFixed(2),
      totalMonthlyCost: +totalMonthlyCost.toFixed(2),
      applianceCount: appliances.length,
      byType,
      rate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
