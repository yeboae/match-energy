const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  location: { type: String, default: 'US Average' },
  ratePerKwh: { type: Number, default: 0.31 },
  goalType: { type: String, enum: ['kwh', 'cost'], default: null },
  goalValue: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
