const mongoose = require('mongoose');

const ApplianceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  home: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', default: null },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['cooling', 'heating', 'kitchen', 'entertainment', 'laundry', 'lighting', 'other'],
    default: 'other'
  },
  wattage: { type: Number, required: true }, // watts
  hoursPerDay: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual: daily kWh
ApplianceSchema.virtual('dailyKwh').get(function () {
  return (this.wattage * this.hoursPerDay) / 1000;
});

// Virtual: monthly kWh
ApplianceSchema.virtual('monthlyKwh').get(function () {
  return this.dailyKwh * 30;
});

ApplianceSchema.set('toJSON', { virtuals: true });
ApplianceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appliance', ApplianceSchema);
