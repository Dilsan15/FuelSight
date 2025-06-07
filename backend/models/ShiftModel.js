const mongoose = require('mongoose');
const { roundHalfUp } = require('../utils/numberUtils');

const shiftSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  submittedByName: {
    type: String,
    required: true,
    trim: true
  },

  timeType: {
    type: String,
    enum: ['Day', 'Night'],
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  shiftDateSubmitted: {
    type: Date,
    required: true,
    default: Date.now
  },

  sales: {
    cashInHand: { type: Number, default: 0 },
    cashWithManager: { type: Number, default: 0 },
    qrTransfer: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    cheques: { type: Number, default: 0 },
    creditSalesTotal: { type: Number, default: 0 },
    creditBackTotal: { type: Number, default: 0 },
    lost: { type: Number, default: 0 }
  },

  lubeSales: [
    {
      description: {
        type: String,
        required: true,
        trim: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],

  nozzleTesting: [
    {
      fuelType: {
        type: String,
        enum: ['HSD', 'MS', 'XG'],
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }
    }
  ],

  readings: [
    {
      fuelType: {
        type: String,
        enum: ['HSD', 'MS', 'XG'],
        required: true
      },
      nozzle: {
        type: Number,
        required: true,
        min: 1
      },
      opening: {
        type: Number,
        required: true,
        min: 0
      },
      closing: {
        type: Number,
        required: true,
        min: 0,
        validate: {
          validator: function (v) {
            return v >= this.opening;
          },
          message: 'Closing reading must be greater than or equal to opening reading'
        }
      }
    }
  ],

  dayRate: {
    HSD: { type: Number, required: true, min: 0 },
    MS: { type: Number, required: true, min: 0 },
    XG: { type: Number, required: true, min: 0 }
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

// Add pre-save middleware to round numbers to 2 decimal places using round half up
shiftSchema.pre('save', function (next) {
  // Round sales numbers (monetary values only)
  if (this.sales) {
    Object.keys(this.sales).forEach(key => {
      if (typeof this.sales[key] === 'number') {
        this.sales[key] = roundHalfUp(this.sales[key], 2);
      }
    });
  }

  // Round lube sales (monetary values only, not quantities)
  if (this.lubeSales) {
    this.lubeSales.forEach(lube => {
      if (typeof lube.amount === 'number') {
        lube.amount = roundHalfUp(lube.amount, 2);
      }
    });
  }

  // Round day rates (monetary values)
  if (this.dayRate) {
    Object.keys(this.dayRate).forEach(key => {
      if (typeof this.dayRate[key] === 'number') {
        this.dayRate[key] = roundHalfUp(this.dayRate[key], 2);
      }
    });
  }

  next();
});

module.exports = mongoose.model('Shift', shiftSchema);
