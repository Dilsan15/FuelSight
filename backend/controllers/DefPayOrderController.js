const mongoose = require('mongoose');
const DefPayOrder = require('../models/DefPayOrderModel');
const DefPayAccount = require('../models/DefPayAccountModel');
const Shift = require('../models/ShiftModel');

// CREATE
const createDefPayOrder = async (req, res) => {
  try {
    const {
      defPayAccount,
      type,
      amount,
      shiftDate,
      paymentType,
      fuelType,
      quantity,
      dueDate,
      submittedByName,
      description,
      code,
      user: userId
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Pump worker (user) must be selected for order submission.' });
    }

    if (!shiftDate) {
      return res.status(400).json({
        error: 'shiftDate is required to associate the order with a shift.'
      });
    }

    const dateStart = new Date(shiftDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(shiftDate);
    dateEnd.setHours(23, 59, 59, 999);

    const shift = await Shift.findOne({
      user: userId,
      shiftDateSubmitted: { $gte: dateStart, $lte: dateEnd }
    });

    const account = await DefPayAccount.findById(defPayAccount);
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    if (type === 'deferal') {
      account.balance -= Number(amount);
    } else if (type === 'payment') {
      account.balance += Number(amount);
    }

    account.paymentHistory.push({
      defPayOrder: undefined,
      amount: type === 'deferal' ? -Number(amount) : Number(amount),
      date: new Date()
    });

    const order = await DefPayOrder.create({
      user: userId,
      defPayAccount,
      type,
      amount,
      shiftId: shift ? shift._id : undefined,
      orderDate: new Date(shiftDate),
      paymentType: type === 'payment' ? paymentType : undefined,
      fuelType: type === 'deferal' ? fuelType : undefined,
      quantity: type === 'deferal' ? quantity : undefined,
      dueDate: type === 'deferal' ? dueDate : undefined,
      submittedByName,
      description,
      code,
      actName: `${account.firstName} ${account.lastName}`
    });

    account.paymentHistory[account.paymentHistory.length - 1].defPayOrder = order._id;
    await account.save();

    if (shift) {
      const key = type === 'payment' ? 'payments' : 'deferrals';
      const salesKey = type === 'payment' ? 'advancePaymentTotal' : 'deferralTotal';

      shift[key].push(order._id);
      if (!shift.sales) shift.sales = {};
      shift.sales[salesKey] = (shift.sales[salesKey] || 0) + Number(amount);

      await shift.save();
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
};

// UPDATE
const updateDefPayOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const existingOrder = await DefPayOrder.findById(id);
    if (!existingOrder) return res.status(404).json({ error: 'Order not found.' });

    const {
      user: newUserId,
      defPayAccount: newAccountId,
      type: newType,
      amount: newAmount,
      shiftDate,
      fuelType,
      quantity,
      dueDate,
      paymentType,
      submittedByName,
      description
    } = req.body;

    // Revert balance from old account
    const oldAccountId = existingOrder.defPayAccount.toString();
    const oldAmount = existingOrder.amount;
    const oldType = existingOrder.type;

    const oldAccount = await DefPayAccount.findById(oldAccountId);
    if (!oldAccount) return res.status(404).json({ error: 'Old account not found.' });

    if (oldType === 'deferal') oldAccount.balance += oldAmount;
    if (oldType === 'payment') oldAccount.balance -= oldAmount;

    oldAccount.paymentHistory = oldAccount.paymentHistory.filter(
      entry => entry.defPayOrder.toString() !== id
    );
    await oldAccount.save();

    // Apply new balance to new account
    const newAccount = await DefPayAccount.findById(newAccountId);
    if (!newAccount) return res.status(404).json({ error: 'New account not found.' });

    if (newType === 'deferal') newAccount.balance -= Number(newAmount);
    if (newType === 'payment') newAccount.balance += Number(newAmount);

    newAccount.paymentHistory.push({
      defPayOrder: id,
      amount: newType === 'deferal' ? -Number(newAmount) : Number(newAmount),
      date: new Date()
    });
    await newAccount.save();

    // Try to find shift to update
    const newShift = await Shift.findOne({
      user: newUserId,
      shiftDateSubmitted: {
        $gte: new Date(shiftDate),
        $lt: new Date(new Date(shiftDate).getTime() + 24 * 60 * 60 * 1000)
      }
    });

    const oldShiftId = existingOrder.shiftId?.toString();
    const newShiftId = newShift?._id?.toString();

    const salesKeyOld = oldType === 'payment' ? 'advancePaymentTotal' : 'deferralTotal';
    const salesKeyNew = newType === 'payment' ? 'advancePaymentTotal' : 'deferralTotal';

    // Always revert from old shift if it exists
    if (oldShiftId) {
      const oldShift = await Shift.findById(oldShiftId);
      if (oldShift) {
        const oldKey = oldType === 'payment' ? 'payments' : 'deferrals';
        oldShift[oldKey] = oldShift[oldKey].filter(oId => oId.toString() !== id);
        oldShift.sales[salesKeyOld] = (oldShift.sales[salesKeyOld] || 0) - oldAmount;
        await oldShift.save();
      }
    }

    // Apply to new shift (if any)
    if (newShift) {
      const listKey = newType === 'payment' ? 'payments' : 'deferrals';
      if (!newShift[listKey].includes(id)) {
        newShift[listKey].push(id);
      }
      newShift.sales[salesKeyNew] = (newShift.sales[salesKeyNew] || 0) + Number(newAmount);
      await newShift.save();
    }

    // Update the order
    const updatePayload = {
    user: newUserId,
    defPayAccount: newAccountId,
    type: newType,
    amount: newAmount,
    shiftId: newShift?._id,
    submittedByName,
    description,
    orderDate: new Date(shiftDate),
    paymentType: newType === 'payment' ? paymentType : undefined,
    fuelType: newType === 'deferal' ? fuelType : undefined,
    quantity: newType === 'deferal' ? quantity : undefined,
    dueDate: newType === 'deferal' ? dueDate : undefined
  };


    const updatedOrder = await DefPayOrder.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true
    });

    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
};

// DELETE
// DELETE
const deleteDefPayOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await DefPayOrder.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // === Update associated shift
    if (order.shiftId) {
      const shift = await Shift.findById(order.shiftId);
      if (shift) {
        const key = order.type === 'payment' ? 'payments' : 'deferrals';
        const salesKey = order.type === 'payment' ? 'advancePaymentTotal' : 'deferralTotal';

        // Remove from payments or deferrals list
        shift[key] = shift[key].filter(oId => oId.toString() !== id);

        // Ensure sales field exists
        if (!shift.sales) shift.sales = {};

        // Subtract amount safely
        shift.sales[salesKey] = (shift.sales[salesKey] || 0) - order.amount;

        await shift.save();
      }
    }

    // === Update associated account
    const account = await DefPayAccount.findById(order.defPayAccount);
    if (account) {
      if (order.type === 'payment') {
        account.balance -= order.amount;
      } else if (order.type === 'deferal') {
        account.balance += order.amount;
      }

      account.paymentHistory = account.paymentHistory.filter(
        entry => entry.defPayOrder.toString() !== id
      );

      await account.save();
    }

    res.status(200).json({ message: '✅ Order deleted and shift/account updated.' });a
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ error: 'Failed to delete order.' });
  }
};


// GET ONE
const getDefPayOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await DefPayOrder.findById(id)
      .populate('user defPayAccount shiftId');
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.status(200).json(order);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
};

// GET MANY
const getDefPayOrders = async (req, res) => {
  const { page = 1, limit = 10, search = '', type } = req.query;

  const query = {};
  const trimmedSearch = search.trim();

  if (type === 'deferal' || type === 'payment') {
    query.type = type;
  }

  const dueInMatch = trimmedSearch.match(/duein:(\d+)/);
  if (dueInMatch) {
    const days = parseInt(dueInMatch[1]);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    query.dueDate = { $lte: targetDate };
  }

  const fuelMatch = trimmedSearch.match(/\b(HSD|MS|XG)\b/i);
  if (fuelMatch) query.fuelType = fuelMatch[1];

  const payMatch = trimmedSearch.match(/\b(QR|Card|Cash)\b/i);
  if (payMatch) query.paymentType = payMatch[1];

  const plainSearch = trimmedSearch
    .replace(/duein:\d+|\b(HSD|MS|XG)\b|\b(QR|Card|Cash)\b/gi, '')
    .trim();

  if (plainSearch) {
    const regex = new RegExp(plainSearch, 'i');
    query.$or = [
      { code: regex },
      { actName: regex },
      { description: regex },
      { submittedByName: regex }
    ];
  }

  try {
    const total = await DefPayOrder.countDocuments(query);
    const orders = await DefPayOrder.find(query)
      .populate('user', 'username stationName')
      .populate('defPayAccount shiftId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const hasMore = page * limit < total;

    res.status(200).json({
      data: orders,
      total,
      page: Number(page),
      hasMore
    });
  } catch (err) {
    console.error('❌ Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

module.exports = {
  createDefPayOrder,
  updateDefPayOrder,
  deleteDefPayOrder,
  getDefPayOrder,
  getDefPayOrders
};
