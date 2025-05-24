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

    console.log(req.body)
    const { shift = {}, creditSales = [], creditBack = [] } = req.body;
    const {
      submittedByName,
      timeType,
      sales = {},
      readings = [],
      dayRate = {},
      lubeSales = [],
      nozzleTesting = [],
      date
    } = shift;

    if (!submittedByName || !timeType) {
      return res.status(400).json({ error: "submittedByName and timeType are required." });
    }

    // Sanitize sales numbers (monetary values)
    const sanitizedSales = {};
    for (const [key, val] of Object.entries(sales)) {
      sanitizedSales[key] = parseFloat((Number(val) || 0).toFixed(2));
    }

    const groupedReadings = readings.reduce((acc, curr) => {
      if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
      acc[curr.fuelType].push(curr);
      return acc;
    }, {});

    const nozzleTestingMap = nozzleTesting.reduce((acc, entry) => {
      acc[entry.fuelType] = parseFloat(entry.quantity || 0);
      return acc;
    }, {});

    let fuelRevenue = 0;
    for (const [fuelType, entries] of Object.entries(groupedReadings)) {
      const rate = parseFloat((parseFloat(dayRate[fuelType] || 0)).toFixed(2));
      const totalVolume = entries.reduce((sum, r) =>
        sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0)), 0);
      const netVolume = totalVolume - (nozzleTestingMap[fuelType] || 0);
      fuelRevenue += parseFloat((netVolume * rate).toFixed(2));
    }

    const lubeRevenue = parseFloat(lubeSales.reduce(
      (sum, l) => sum + parseFloat((parseFloat(l.amount || 0)).toFixed(2)), 0).toFixed(2));
    const lost = parseFloat((parseFloat(sanitizedSales.lost || 0)).toFixed(2));
    const total = parseFloat((fuelRevenue + lubeRevenue - lost).toFixed(2));

    const shiftDateParsed = Date.parse(date);
    const shiftDate = isNaN(shiftDateParsed) ? new Date() : new Date(shiftDateParsed);
    const shiftDateISO = shiftDate.toISOString().split("T")[0];

    const shiftDoc = await Shift.create({
      user: req.user._id,
      submittedByName,
      timeType,
      shiftDateSubmitted: shiftDate,
      sales: sanitizedSales,
      readings: readings.map(r => ({
        ...r,
        opening: parseFloat(r.opening || 0),
        closing: parseFloat(r.closing || 0)
      })),
      dayRate: Object.fromEntries(
        Object.entries(dayRate).map(([key, val]) => [key, parseFloat((parseFloat(val || 0)).toFixed(2))])
      ),
      lubeSales: lubeSales.map(l => ({
        ...l,
        amount: parseFloat((parseFloat(l.amount || 0)).toFixed(2)),
        quantity: parseFloat(l.quantity || 0)
      })),
      nozzleTesting: nozzleTesting.map(f => ({
        ...f,
        quantity: parseFloat(f.quantity || 0)
      })),
      total
    });

    const accountMap = {};

    for (const d of creditSales) {
      if (!accountMap[d.code]) {
        const found = await DefPayAccount.findOne({ code: d.code });
        if (!found) {
          return res.status(400).json({
            error: `Credit Sale account with code "${d.code}" does not exist. Only admins can create new accounts.`
          });
        }
        accountMap[d.code] = found;
      }

      const account = accountMap[d.code];
      const amount = parseFloat((Number(d.amount || 0)).toFixed(2));
      const fuelType = d.fuelType;
      const rate = parseFloat((parseFloat(dayRate[fuelType] || 0)).toFixed(2));
      const quantity = parseFloat(amount / rate);

      const creditSaleOrder = await DefPayOrder.create({
        code: d.code,
        type: 'creditSale',
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

      shiftDoc.creditSales.push(creditSaleOrder._id);
      shiftDoc.sales.creditSalesTotal = (shiftDoc.sales.creditSalesTotal || 0) + amount;

      account.balance -= amount;
      account.paymentHistory.push({
        amount: -amount,
        date: new Date(),
        defPayOrder: creditSaleOrder._id
      });

      await account.save();
    }

    for (const p of creditBack) {
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


      const creditBackOrder = await DefPayOrder.create({
        code: p.code,
        actName: `${account.firstName} ${account.lastName}`,
        type: 'creditBack',
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

      shiftDoc.creditBack.push(creditBackOrder._id);
      shiftDoc.sales.creditBackTotal = (shiftDoc.sales.creditBackTotal || 0) + paymentAmount;

      account.balance += paymentAmount;
      account.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        defPayOrder: creditBackOrder._id
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
      const key = order.type === 'creditBack' ? 'creditBack' : 'creditSales';
      const salesKey = order.type === 'creditBack' ? 'creditBackTotal' : 'creditSalesTotal';

      if (!shiftDoc[key].some(id => id.toString() === order._id.toString())) {
        shiftDoc[key].push(order._id);
        shiftDoc.sales[salesKey] = (shiftDoc.sales[salesKey] || 0) + order.amount;
      }
    }

    await shiftDoc.save();

    console.log(`🔗 Linked ${updatedOrders.modifiedCount} unlinked orders to shift ${shiftDoc._id}`);

    res.status(201).json({
      message: '✅ Shift and related credit sales/backs submitted successfully.',
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
    if (req.body.nozzleTesting) shift.nozzleTesting = req.body.nozzleTesting;

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
    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    const user = await User.findById(shift.user);
    if (!user) {
      return res.status(404).json({ error: 'Associated user not found.' });
    }

    // Subtract fuel usage from user's readings
    if (Array.isArray(shift.readings)) {
      for (const reading of shift.readings) {
        const { fuelType, opening, closing } = reading;
        const nozzle = reading.nozzle ?? null;

        const change = parseFloat(closing) - parseFloat(opening);

        const userReading = user.readings.find(
          r => r.fuelType === fuelType && (r.nozzle === nozzle || nozzle === null)
        );

        if (userReading) {
          userReading.closing -= change;
          if (userReading.closing < 0) userReading.closing = 0; // Prevent negative
        }
      }
    }

    await user.save();

    // Delete the shift
    await Shift.findByIdAndDelete(id);

    // Unlink any associated def/pay orders
    await DefPayOrder.updateMany(
      { shiftId: id },
      { $unset: { shiftId: "" } }
    );

    res.status(200).json({ message: '✅ Shift deleted and user readings updated. Orders unlinked.' });

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
     .populate({ path: "creditSales", select: "amount code actName fuelType quantity dueDate" })
     .populate({ path: "creditBack",  select: "amount code actName paymentType" })
     .populate({ path: "user", select: "stationName" })
     .lean();          // optional – send plain objects

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
   
     .populate({ path: "creditSales", select: "amount code actName fuelType quantity dueDate" })
     .populate({ path: "creditBack",  select: "amount code actName paymentType" })
     .populate({ path: "user", select: "stationName" })
     .lean();          
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
