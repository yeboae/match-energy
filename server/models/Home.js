const mongoose = require('mongoose');

const HomeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  location: { type: String, default: 'US Average' },
  ratePerKwh: { type: Number, default: 0.13 },
  goalType: { type: String, enum: ['kwh', 'cost'], default: null },
  goalValue: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Home', HomeSchema);
