const express = require('express');
const router = express.Router();
const Appliance = require('../models/Appliance');
const auth = require('../middleware/auth');

// GET /api/appliances?homeId=xxx
router.get('/', auth, async (req, res) => {
  try {
    const query = { user: req.user.id, isActive: true };
    if (req.query.homeId) query.home = req.query.homeId;
    const appliances = await Appliance.find(query).sort('-createdAt');
    res.json(appliances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appliances
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, wattage, hoursPerDay, homeId } = req.body;
    if (!name || !wattage || !hoursPerDay) return res.status(400).json({ error: 'name, wattage, and hoursPerDay are required' });
    const appliance = await Appliance.create({ user: req.user.id, home: homeId || null, name, type, wattage, hoursPerDay });
    res.status(201).json(appliance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appliances/:id
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

module.exports = router;
