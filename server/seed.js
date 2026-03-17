// seed.js — run with: node seed.js
// Creates a demo user and pre-loads appliances for the midterm demo

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/match-energy';

const UserSchema = new mongoose.Schema({
  email: String, password: String, location: String, ratePerKwh: Number, createdAt: { type: Date, default: Date.now }
});
const ApplianceSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  name: String, type: String, wattage: Number, hoursPerDay: Number,
  isActive: { type: Boolean, default: true }, createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Appliance = mongoose.model('Appliance', ApplianceSchema);

const DEMO_APPLIANCES = [
  { name: 'Window AC Unit',   type: 'cooling',       wattage: 1000, hoursPerDay: 8  },
  { name: 'Gaming PC',        type: 'entertainment', wattage: 600,  hoursPerDay: 4  },
  { name: 'Refrigerator',     type: 'kitchen',       wattage: 150,  hoursPerDay: 24 },
  { name: 'Electric Dryer',   type: 'laundry',       wattage: 5000, hoursPerDay: 1  },
  { name: 'Space Heater',     type: 'heating',       wattage: 1500, hoursPerDay: 3  },
  { name: 'LED Lighting (5x)',type: 'lighting',      wattage: 50,   hoursPerDay: 6  },
  { name: 'Microwave',        type: 'kitchen',       wattage: 1200, hoursPerDay: 0.5},
  { name: 'TV (55")',         type: 'entertainment', wattage: 100,  hoursPerDay: 4  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing demo user
  const existing = await User.findOne({ email: 'demo@matchenergy.com' });
  if (existing) {
    await Appliance.deleteMany({ user: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log('Cleared existing demo user');
  }

  // Create demo user
  const hashed = await bcrypt.hash('demo1234', 10);
  const user = await User.create({
    email: 'demo@matchenergy.com',
    password: hashed,
    location: 'Troy, NY',
    ratePerKwh: 0.18
  });
  console.log('Created demo user: demo@matchenergy.com / demo1234');

  // Create appliances
  const appliances = DEMO_APPLIANCES.map(a => ({ ...a, user: user._id }));
  await Appliance.insertMany(appliances);
  console.log(`Seeded ${appliances.length} appliances`);

  const totalMonthly = appliances.reduce((sum, a) => sum + (a.wattage * a.hoursPerDay * 30) / 1000, 0);
  console.log(`\nDemo stats:`);
  console.log(`  Total monthly: ${totalMonthly.toFixed(0)} kWh`);
  console.log(`  Estimated cost: $${(totalMonthly * 0.18).toFixed(2)}/mo at $0.18/kWh`);
  console.log('\n✅ Seed complete. Login: demo@matchenergy.com / demo1234');

  await mongoose.disconnect();
}

seed().catch(console.error);
