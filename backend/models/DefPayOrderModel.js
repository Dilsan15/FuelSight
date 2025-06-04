const mongoose = require('mongoose');
const { roundHalfUp } = require('../utils/numberUtils');

const defPayOrderSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  actName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['creditSale', 'creditBack'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Description cannot be longer than 500 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  defPayAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DefPayAccount',
    required: true
  },
  submittedByName: {
    type: String,
    required: true,
    trim: true
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  orderDate: {
    type: Date,
    required: true,

  },
  dueDate: {
    type: Date,
    required: function () {
      return this.type === 'creditSale';
    },
    validate: {
      validator: function (v) {
        if (this.type !== 'creditSale') return true;
        return v > this.orderDate;
      },
      message: 'Due date must be after order date'
    },
    default: function () {
      return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    }
  },
  paymentType: {
    type: String,
    enum: ['QR', 'Cash', 'Card', 'Cheques'],
    required: function () {
      return this.type === 'creditBack';
    }
  },
  fuelType: {
    type: String,
    enum: ['HSD', 'MS', 'XG'],
    required: false  // Optional for admin orders
  },
  quantity: {
    type: Number,
    required: false,  // Optional for admin orders
    min: [0, 'Quantity cannot be negative'],

    // 🔽 Setter: always store with exactly two decimals using round half up
    set: v => (v == null ? v : roundHalfUp(v, 2)),

    validate: {
      validator(v) {
        // Allow undefined/null for admin orders
        if (v == null) return true;
        // no check needed for credit-back orders
        if (this.type !== 'creditSale') return true;
        return v > 0;
      },
      message: 'Quantity must be greater than 0 for credit sales'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware for validation
defPayOrderSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('type')) {
    // Validate credit sale requirements (relaxed for admin orders)
    if (this.type === 'creditSale') {
      if (!this.dueDate) {
        throw new Error('Credit sale requires dueDate');
      }
      // Only validate quantity if it's provided
      if (this.quantity != null && this.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      // Clear credit back specific fields
      this.paymentType = undefined;
    }

    // Validate credit back requirements
    if (this.type === 'creditBack') {
      if (!this.paymentType) {
        throw new Error('Credit back requires payment type');
      }
      // Clear credit sale specific fields for credit back
      this.fuelType = undefined;
      this.quantity = undefined;
      this.dueDate = undefined;
    }
  }
  next();
});

// Virtual for calculating status
defPayOrderSchema.virtual('status').get(function () {
  if (this.type !== 'creditSale') return 'NA';

  const now = new Date();
  const dueDate = new Date(this.dueDate);

  if (now > dueDate) return 'OVERDUE';
  if (now > new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000)) return 'DUE_SOON';
  return 'ACTIVE';
});

// Index for better query performance
defPayOrderSchema.index({ orderDate: -1 });
defPayOrderSchema.index({ type: 1, orderDate: -1 });
defPayOrderSchema.index({ defPayAccount: 1, orderDate: -1 });

module.exports = mongoose.model('DefPayOrder', defPayOrderSchema);


