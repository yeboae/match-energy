const mongoose = require('mongoose');

const APPLIANCE_TYPES = [
  'HVAC', 'Kitchen', 'Laundry', 'Entertainment', 'Lighting',
  'Office', 'Water Heating', 'Other'
];

const applianceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: APPLIANCE_TYPES, default: 'Other' },
  wattage: { type: Number, required: true, min: 1 },
  dailyHours: { type: Number, required: true, min: 0, max: 24 },
  active: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  // track history of usage changes
  usageHistory: [{
    dailyHours: Number,
    changedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Virtual: daily kWh
applianceSchema.virtual('dailyKwh').get(function() {
  return (this.wattage * this.dailyHours) / 1000;
});

// Virtual: monthly kWh
applianceSchema.virtual('monthlyKwh').get(function() {
  return this.dailyKwh * 30;
});

applianceSchema.set('toJSON', { virtuals: true });
applianceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appliance', applianceSchema);
