const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  submittedByName: {
    type: String,
    required: true
  },

  timeType: {
    type: String,
    enum: ['Day', 'Night'],
    required: true
  },

  shiftDateSubmitted: {
    type: Date,
  },

  sales: {
    
    cashInHand: { type: Number, default: 0 },
    cashWithManager: { type: Number, default: 0 },
    qrTransfer: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    deferralTotal: { type: Number, default: 0 },
    lost: {type: Number, default: 0}
  },

  lubeSales: [
    {
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      quantity: { type: Number, default: 0 },
    }
  ],

  thrownOutFuel: [
    {
      fuelType: {
        type: String,
        enum: ['XG', 'HSD', 'MS'],
        required: true
      },
      quantity: { type: Number, required: true }
    }
  ],

  readings: [
    {
      fuelType: {
        type: String,
        enum: ['XG', 'HSD', 'MS'],
        required: true
      },
      opening: { type: Number, required: true },
      closing: { type: Number, required: true }
    }
  ],

  dayRate: {
    XG: { type: Number},
    HSD: { type: Number},
    MS: { type: Number }
  },


  deferrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DefPayOrder'
    }
  ],

  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DefPayOrder'
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
