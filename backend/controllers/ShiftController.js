const Shift = require('../models/ShiftModel');
const DefPayOrder = require('../models/DefPayOrderModel');
const DefPayAccount = require('../models/DefPayAccountModel');
const User = require("../models/UserModel");

const getDefaultDueDate = () => {
  return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
};

// SUBMIT Shift
const submitShift = async (req, res) => {
  try {
    const { shift = {}, deferals = [], payments = [] } = req.body;
    const {
      submittedByName,
      timeType,
      sales = {},
      readings = [],
      dayRate = {},
      lubeSales = [],
      thrownOutFuel = [],
      date
    } = shift;

    if (!submittedByName || !timeType) {
      return res.status(400).json({ error: "submittedByName and timeType are required." });
    }

    const sanitizedSales = {};
    for (const [key, val] of Object.entries(sales)) {
      sanitizedSales[key] = Number(val) || 0;
    }

    const groupedReadings = readings.reduce((acc, curr) => {
      if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
      acc[curr.fuelType].push(curr);
      return acc;
    }, {});

    const thrownMap = thrownOutFuel.reduce((acc, entry) => {
      acc[entry.fuelType] = parseFloat(entry.quantity || 0);
      return acc;
    }, {});

    let fuelRevenue = 0;
    for (const [fuelType, entries] of Object.entries(groupedReadings)) {
      const rate = parseFloat(dayRate[fuelType] || 0);
      const totalVolume = entries.reduce((sum, r) =>
        sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0)), 0);
      const netVolume = totalVolume - (thrownMap[fuelType] || 0);
      fuelRevenue += netVolume * rate;
    }

    const lubeRevenue = lubeSales.reduce(
      (sum, l) => sum + parseFloat(l.amount || 0), 0);
    const lost = parseFloat(sanitizedSales.lost || 0);
    const total = fuelRevenue + lubeRevenue - lost;

    const shiftDateParsed = Date.parse(date);
    const shiftDate = isNaN(shiftDateParsed) ? new Date() : new Date(shiftDateParsed);
    const shiftDateISO = shiftDate.toISOString().split("T")[0];

    const shiftDoc = await Shift.create({
      user: req.user._id,
      submittedByName,
      timeType,
      shiftDateSubmitted: shiftDate,
      sales: sanitizedSales,
      readings,
      dayRate,
      lubeSales,
      thrownOutFuel,
      total
    });

    const accountMap = {};

    for (const d of deferals) {
      if (!accountMap[d.code]) {
        const found = await DefPayAccount.findOne({ code: d.code });
        if (!found) {
          return res.status(400).json({
            error: `Deferral account with code "${d.code}" does not exist. Only admins can create new accounts.`
          });
        }
        accountMap[d.code] = found;
      }

      const account = accountMap[d.code];
      const quantity = Number(d.litres || 0);
      const fuelType = d.fuelType;
      const rate = parseFloat(dayRate[fuelType] || 0);
      const amount = Math.round(quantity * rate);

      const deferalOrder = await DefPayOrder.create({
        code: d.code,
        type: 'deferal',
        actName: `${account.firstName} ${account.lastName}`,
        amount,
        quantity,
        fuelType,
        description: d.description || '',
        submittedBy: req.user._id,
        submittedByName,
        user: req.user._id,
        shiftId: shiftDoc._id,
        defPayAccount: account._id,
        dueDate: d.dueDate || getDefaultDueDate(),
        orderDate: shiftDate,
      });

      shiftDoc.deferrals.push(deferalOrder._id);
      shiftDoc.sales.deferralTotal = (shiftDoc.sales.deferralTotal || 0) + amount;

      account.balance -= amount;
      account.paymentHistory.push({
        amount: -amount,
        date: new Date(),
        defPayOrder: deferalOrder._id
      });

      await account.save();
    }

    for (const p of payments) {
      if (!accountMap[p.code]) {
        const found = await DefPayAccount.findOne({ code: p.code });
        if (!found) {
          console.warn(`⚠️ Skipping payment: Account with code "${p.code}" not found.`);
          continue;
        }
        accountMap[p.code] = found;
      }

      const account = accountMap[p.code];
      const paymentAmount = Number(p.amount || 0);

      const paymentOrder = await DefPayOrder.create({
        code: p.code,
        actName: `${account.firstName} ${account.lastName}`,
        type: 'payment',
        amount: paymentAmount,
        description: p.note || '',
        submittedBy: req.user._id,
        submittedByName,
        user: req.user._id,
        shiftId: shiftDoc._id,
        defPayAccount: account._id,
        paymentType: p.paymentType,
        orderDate: shiftDate,
      });

      shiftDoc.payments.push(paymentOrder._id);
      shiftDoc.sales.advancePaymentTotal = (shiftDoc.sales.advancePaymentTotal || 0) + paymentAmount;

      account.balance += paymentAmount;
      account.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        defPayOrder: paymentOrder._id
      });

      await account.save();
    }

    const userDoc = await User.findById(req.user._id);
    if (userDoc) {
      const updated = userDoc.readings || [];
      for (const reading of readings) {
        const idx = updated.findIndex(r => r.fuelType === reading.fuelType && r.nozzle === reading.nozzle);
        if (idx !== -1) {
          updated[idx].closing = parseFloat(reading.closing || 0);
        } else {
          updated.push({
            fuelType: reading.fuelType,
            nozzle: reading.nozzle,
            closing: parseFloat(reading.closing || 0)
          });
        }
      }
      userDoc.readings = updated;
      await userDoc.save();
    }

    // 🔗 Link unlinked past orders for same user and date
    const updatedOrders = await DefPayOrder.updateMany(
      {
        user: req.user._id,
        shiftId: { $exists: false },
        $expr: {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
            shiftDateISO
          ]
        }
      },
      { $set: { shiftId: shiftDoc._id } }
    );

    // Fetch those orders
    const linkedOrders = await DefPayOrder.find({
      user: req.user._id,
      shiftId: shiftDoc._id,
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          shiftDateISO
        ]
      }
    });

    for (const order of linkedOrders) {
      const key = order.type === 'payment' ? 'payments' : 'deferrals';
      const salesKey = order.type === 'payment' ? 'advancePaymentTotal' : 'deferralTotal';

      if (!shiftDoc[key].some(id => id.toString() === order._id.toString())) {
        shiftDoc[key].push(order._id);
        shiftDoc.sales[salesKey] = (shiftDoc.sales[salesKey] || 0) + order.amount;
      }
    }

    await shiftDoc.save();

    console.log(`🔗 Linked ${updatedOrders.modifiedCount} unlinked orders to shift ${shiftDoc._id}`);

    res.status(201).json({
      message: '✅ Shift and related deferals/payments submitted successfully.',
      shiftId: shiftDoc._id
    });

  } catch (error) {
    console.error('❌ Shift submission error:', error);
    res.status(500).json({ error: 'Server error submitting shift.' });
  }
};

// UPDATE Shift
const updateShift = async (req, res) => {
  const { id } = req.params;
  const { sales, readings, dayRate } = req.body;

  try {
    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    if (sales) shift.sales = sales;
    if (readings) shift.readings = readings;
    if (dayRate) shift.dayRate = dayRate;
    if (req.body.lubeSales) shift.lubeSales = req.body.lubeSales;
    if (req.body.thrownOutFuel) shift.thrownOutFuel = req.body.thrownOutFuel;

    await shift.save();
    res.status(200).json({ message: '✅ Shift updated successfully.', shift });

  } catch (error) {
    console.error('❌ Shift update error:', error);
    res.status(500).json({ error: 'Server error updating shift.' });
  }
};

// DELETE Shift
const deleteShift = async (req, res) => {
  const { id } = req.params;

  try {
    const shift = await Shift.findByIdAndDelete(id);
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    await DefPayOrder.updateMany(
      { shiftId: id },
      { $unset: { shiftId: "" } }
    );

    res.status(200).json({ message: '✅ Shift deleted and all linked orders unlinked.' });
  } catch (error) {
    console.error('❌ Shift deletion error:', error);
    res.status(500).json({ error: 'Server error deleting shift.' });
  }
};

// GET Shifts
const getShifts = async (req, res) => {
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 50;
  const { start, end } = req.query;

  const filter = {};
  if (start || end) {
    filter.shiftDateSubmitted = {};
    if (start) filter.shiftDateSubmitted.$gte = new Date(start);
    if (end) filter.shiftDateSubmitted.$lte = new Date(end);
  }

  try {
    const shifts = await Shift.find(filter)
      .sort({ shiftDateSubmitted: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username stationName');

    const total = await Shift.countDocuments(filter);

    res.status(200).json({
      total,
      count: shifts.length,
      results: shifts
    });
  } catch (error) {
    console.error('❌ Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts.' });
  }
};

// GET Single Shift
const getShift = async (req, res) => {
  const { id } = req.params;

  try {
    const shift = await Shift.findById(id)
      .populate('user', 'username stationName')
      .populate('deferrals')
      .populate('payments');

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    res.status(200).json(shift);
  } catch (error) {
    console.error('❌ Error fetching shift by ID:', error);
    res.status(500).json({ error: 'Failed to fetch shift.' });
  }
};

module.exports = {
  submitShift,
  updateShift,
  deleteShift,
  getShifts,
  getShift
};
