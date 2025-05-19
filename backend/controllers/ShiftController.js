const Shift = require('../models/ShiftModel');
const DefPayOrder = require('../models/DefPayOrderModel');
const DefPayAccount = require('../models/DefPayAccountModel');

const User = require("../models/UserModel");

const getDefaultDueDate = () => {
  return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
};

// SUBMIT Shift


const submitShift = async (req, res) => {
  console.log("🔻 Incoming Shift Submission:\n", JSON.stringify(req.body, null, 2));

  try {
    const { shift = {}, deferals = [], payments = [] } = req.body;

    const {
      submittedByName,
      timeType,
      sales = {},
      readings = [],
      dayRate = {},
      lubeSales = [],
      thrownOutFuel = []
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
      const totalVolume = entries.reduce((sum, r) => {
        return sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0));
      }, 0);
      const thrown = thrownMap[fuelType] || 0;
      const netVolume = totalVolume - thrown;
      fuelRevenue += netVolume * rate;
    }

    const lubeRevenue = lubeSales.reduce(
      (sum, l) => sum + parseFloat(l.amount || 0),
      0
    );

    const lost = parseFloat(sanitizedSales.lost || 0);
    const total = fuelRevenue + lubeRevenue - lost;

    const shiftDoc = await Shift.create({
      user: req.user._id,
      submittedByName,
      timeType,
      sales: sanitizedSales,
      readings,
      dayRate,
      lubeSales,
      thrownOutFuel,
      total
    });

    const accountMap = {};

    // === Deferals
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
        status: 'unpaid'
      });

      shiftDoc.deferrals.push(deferalOrder._id);

      await DefPayAccount.updateOne(
        { _id: account._id },
        {
          $inc: { totalOutstanding: -amount },
          $push: {
            paymentHistory: {
              amount: -amount,
              date: new Date(),
              defPayOrder: deferalOrder._id
            }
          }
        },
        { writeConcern: { w: "majority", j: true } }
      );
    }

    // === Payments
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
        paymentType: p.paymentType
      });

      account.totalOutstanding += paymentAmount;
      account.markModified("totalOutstanding");

      account.paymentHistory = account.paymentHistory || [];
      account.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        defPayOrder: paymentOrder._id
      });

      account.markModified("paymentHistory");

      try {
        await account.save();
        console.log(`✅ Account ${account.code} saved successfully.`);
      } catch (err) {
        console.error(`❌ Failed to save account ${account.code}:`, err);
      }

      shiftDoc.payments.push(paymentOrder._id);
    }

    // === Update user's stored readings to latest closing values
    const userDoc = await User.findById(req.user._id);
    if (userDoc) {
      const updated = userDoc.readings || [];

      for (const reading of readings) {
        const idx = updated.findIndex(
          (r) => r.fuelType === reading.fuelType && r.nozzle === reading.nozzle
        );

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


    await shiftDoc.save();

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

    await DefPayOrder.deleteMany({ shiftId: id });

    res.status(200).json({ message: '✅ Shift and its deferals deleted.' });
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
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = new Date(start);
    if (end) filter.createdAt.$lte = new Date(end);
  }

  try {
    const shifts = await Shift.find(filter)
      .sort({ createdAt: -1 })
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

module.exports = {
  submitShift,
  updateShift,
  deleteShift,
  getShifts
};