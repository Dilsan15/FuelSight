const mongoose = require('mongoose');

const defPayAccountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  firstName: {
    type: String,
    default: '',
    required: true
  },

  lastName: {
    type: String,
    default: '',
    required: true
  },

  phoneNumber: {
    type: String,
    sparse: true,
    default: ''
  },

  address: {
    type: String,
    default: '',
    required: true
  },

  balance: {
    type: Number,
    default: 0
  },

  paymentHistory: [
    {
      defPayOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DefPayOrder',
        required: true
      },
      amount: { type: Number, required: true },
      date: { type: Date, required: true }
    }
  ],

  note: {
    type: String,
    default: ''
  }

}, { timestamps: true });

module.exports = mongoose.models.DefPayAccount || mongoose.model('DefPayAccount', defPayAccountSchema);
