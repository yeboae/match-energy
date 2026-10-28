const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Home = require('../models/Home');
const Appliance = require('../models/Appliance');
const User = require('../models/User');

// GET /api/homes — get all homes; auto-create default if none exist
router.get('/', auth, async (req, res) => {
  try {
    let homes = await Home.find({ user: req.user.id }).sort('createdAt');
    if (homes.length === 0) {
      const user = await User.findById(req.user.id);
      const defaultHome = await Home.create({
        user: req.user.id,
        name: 'My Home',
        location: user.location || 'US Average',
        ratePerKwh: user.ratePerKwh || 0.13,
        goalType: user.goalType || null,
        goalValue: user.goalValue || null,
      });
      // Migrate any existing appliances to this home
      await Appliance.updateMany(
        { user: req.user.id, $or: [{ home: null }, { home: { $exists: false } }] },
        { home: defaultHome._id }
      );
      homes = [defaultHome];
    }
    res.json(homes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/homes — create new home
router.post('/', auth, async (req, res) => {
  try {
    const { name, location, ratePerKwh } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Home name is required' });
    const home = await Home.create({
      user: req.user.id,
      name: name.trim(),
      location: location || 'US Average',
      ratePerKwh: parseFloat(ratePerKwh) || 0.13,
    });
    res.status(201).json(home);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/homes/:id — update home settings
router.put('/:id', auth, async (req, res) => {
  try {
    const home = await Home.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!home) return res.status(404).json({ error: 'Home not found' });
    res.json(home);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/homes/:id — delete home and its appliances
router.delete('/:id', auth, async (req, res) => {
  try {
    const count = await Home.countDocuments({ user: req.user.id });
    if (count <= 1) return res.status(400).json({ error: 'Cannot delete your only home' });
    const home = await Home.findOne({ _id: req.params.id, user: req.user.id });
    if (!home) return res.status(404).json({ error: 'Home not found' });
    await Appliance.deleteMany({ home: req.params.id });
    await Home.deleteOne({ _id: req.params.id });
    res.json({ message: 'Home deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
