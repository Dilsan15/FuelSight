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
    creditSalesTotal: { type: Number, default: 0 },
    creditBackTotal: { type: Number, default: 0 },
    lost: {type: Number, default: 0}
  },

  lubeSales: [
    {
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      quantity: { type: Number, default: 0 },
    }
  ],

  nozzleTesting: [
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
      nozzle: {
        type: Number,
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

  creditSales: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DefPayOrder'
    }
  ],

  creditBack: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DefPayOrder'
    }
  ]

}, { timestamps: true });

// Add pre-save middleware to round numbers to 2 decimal places
shiftSchema.pre('save', function(next) {
  // Round sales numbers (monetary values only)
  if (this.sales) {
    Object.keys(this.sales).forEach(key => {
      if (typeof this.sales[key] === 'number') {
        this.sales[key] = parseFloat(this.sales[key].toFixed(2));
      }
    });
  }

  // Round lube sales (monetary values only, not quantities)
  if (this.lubeSales) {
    this.lubeSales.forEach(lube => {
      if (typeof lube.amount === 'number') {
        lube.amount = parseFloat(lube.amount.toFixed(2));
      }
    });
  }

  // Round day rates (monetary values)
  if (this.dayRate) {
    Object.keys(this.dayRate).forEach(key => {
      if (typeof this.dayRate[key] === 'number') {
        this.dayRate[key] = parseFloat(this.dayRate[key].toFixed(2));
      }
    });
  }

  next();
});

module.exports = mongoose.model('Shift', shiftSchema);
