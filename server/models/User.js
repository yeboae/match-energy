const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  location: { type: String, default: 'US Average' },
  ratePerKwh: { type: Number, default: 0.13 }, // $/kWh
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
