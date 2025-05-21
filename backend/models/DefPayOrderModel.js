const mongoose = require('mongoose');

const defPayOrderSchema = new mongoose.Schema({

  code:{
    type:String,
    required: true
  },
  actName:{
    type:String,
    required: true
  },
  type: {
    type: String,
    enum: ['deferal', 'payment'],
    required: true
  },

  amount: {
    type: Number,
    required: true
  },


  description: {
    type: String,
    default: ''
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
    required: true
  },

  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },

  orderDate: {
    type: Date,
    required: true
  },

  dueDate: {
    type: Date,
    required: function () {
      return this.type === 'deferal';
    },
    default: function () {
      return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    }
  },

  paymentType: {
    type: String,
    enum: ['QR', 'Cash', 'Card',],
    required: function () {
      return this.type === 'payment';
    }
  },

  fuelType: {
    type: String,
    enum: ['HSD', 'MS', 'XG'],
    required: function () {
      return this.type === 'deferal';
    }
  },

  quantity: {
    type: Number,
    required: function () {
      return this.type === 'deferal';
    }
  }

}, { timestamps: true });


defPayOrderSchema.pre('validate', function (next) {
  if (this.type !== 'deferal') {
    this.amountPaid = undefined;
    this.status = undefined
    this.quantity = undefined
    this.fuelType = undefined
    this.dueDate = undefined
  }
  next();
});

module.exports = mongoose.model('DefPayOrder', defPayOrderSchema);


