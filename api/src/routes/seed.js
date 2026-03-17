const router = require('express').Router();
const User = require('../models/User');
const Appliance = require('../models/Appliance');

const SEED_APPLIANCES = [
  { name: 'Window AC Unit', type: 'HVAC', wattage: 1200, dailyHours: 8, notes: 'Living room, runs in summer' },
  { name: 'Refrigerator', type: 'Kitchen', wattage: 150, dailyHours: 24, notes: 'Always on' },
  { name: 'Washing Machine', type: 'Laundry', wattage: 500, dailyHours: 1, notes: 'About 1 load/day' },
  { name: 'Electric Dryer', type: 'Laundry', wattage: 5000, dailyHours: 0.75, notes: '' },
  { name: 'Gaming PC', type: 'Entertainment', wattage: 400, dailyHours: 4, notes: 'High-end build' },
  { name: 'LED TV (55")', type: 'Entertainment', wattage: 120, dailyHours: 5, notes: '' },
  { name: 'Space Heater', type: 'HVAC', wattage: 1500, dailyHours: 6, notes: 'Bedroom, winter only' },
  { name: 'Microwave', type: 'Kitchen', wattage: 1000, dailyHours: 0.25, notes: '' },
  { name: 'LED Lighting (whole home)', type: 'Lighting', wattage: 200, dailyHours: 6, notes: 'Estimated total' },
  { name: 'Laptop', type: 'Office', wattage: 65, dailyHours: 8, notes: 'Work from home' },
];

// POST /api/seed - create demo user with appliances
router.post('/', async (req, res) => {
  try {
    // Remove existing demo user
    const existing = await User.findOne({ email: 'demo@matchenergy.com' });
    if (existing) {
      await Appliance.deleteMany({ user: existing._id });
      await User.deleteOne({ _id: existing._id });
    }

    const user = await User.create({
      name: 'Alex Demo',
      email: 'demo@matchenergy.com',
      password: 'demo1234',
      electricityRate: 0.13,
      zipCode: '12180'
    });

    const appliances = await Appliance.insertMany(
      SEED_APPLIANCES.map(a => ({ ...a, user: user._id, usageHistory: [{ dailyHours: a.dailyHours }] }))
    );

    res.json({ message: 'Seeded successfully', user: { email: user.email, password: 'demo1234' }, applianceCount: appliances.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
