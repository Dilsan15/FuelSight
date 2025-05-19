const mongoose = require('mongoose');

const dayRateSchema = new mongoose.Schema({
  setBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rates: {
    XG: { type: Number, required: true },
    HSD: { type: Number, required: true },
    MS: { type: Number, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('DayRate', dayRateSchema);
