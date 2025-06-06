const Shift = require('../models/ShiftModel');
const DefPayOrder = require('../models/DefPayOrderModel');
const DefPayAccount = require('../models/DefPayAccountModel');
const User = require("../models/UserModel");
const { withTransactionRetry } = require('../utils/transactionHelper');
const { roundHalfUp, toSafeNumber, safeAdd, safeSubtract, safeMultiply } = require('../utils/numberUtils');

const getDefaultDueDate = () => {
  return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
};

/**
 * Utility function to ensure user readings are accurate and consistent
 * @param {Object} userDoc - User document
 * @param {Array} shiftReadings - Readings from the shift
 * @param {string} operation - 'update' or 'revert'
 */
const updateUserReadings = async (userDoc, shiftReadings, operation = 'update') => {
  if (!userDoc || !Array.isArray(shiftReadings)) {
    console.log('❌ Invalid parameters for updateUserReadings');
    return;
  }

  const updated = userDoc.readings || [];

  for (const reading of shiftReadings) {
    const { fuelType, nozzle, opening, closing } = reading;
    const idx = updated.findIndex(r => r.fuelType === fuelType && r.nozzle === nozzle);

    if (operation === 'update') {
      // For normal updates, set closing to the shift's closing value
      const newClosing = roundHalfUp(closing || 0, 2);

      if (idx !== -1) {
        updated[idx].closing = newClosing;
      } else {
        updated.push({
          fuelType,
          nozzle,
          closing: newClosing
        });
      }
    } else if (operation === 'revert') {
      // For deletions, revert to the opening value
      const revertedClosing = roundHalfUp(opening || 0, 2);

      if (idx !== -1) {
        updated[idx].closing = revertedClosing;
      }
    }
  }

  // Ensure all readings are properly rounded and non-negative
  updated.forEach(reading => {
    reading.closing = roundHalfUp(reading.closing || 0, 2);
    if (reading.closing < 0) reading.closing = 0;
  });

  userDoc.readings = updated;
  await userDoc.save();
  console.log(`✅ User readings ${operation}d successfully with proper validation`);
};

/**
 * Synchronizes user readings with their latest shift's closing readings
 * @param {string} userId - User ID to synchronize
 */
const synchronizeUserReadings = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found for synchronization');
      return;
    }

    // Find the user's most recent shift, giving priority to night shifts
    const latestShift = await Shift.findOne({ user: userId })
      .sort({
        shiftDateSubmitted: -1,  // Most recent date first
        timeType: 1              // Night shifts get priority (Night comes after Day alphabetically)
      })
      .lean();

    if (!latestShift || !latestShift.readings) {
      console.log('❌ No shifts found for user or no readings in latest shift');
      return;
    }

    console.log(`🔄 Synchronizing user readings with latest ${latestShift.timeType} shift from ${new Date(latestShift.shiftDateSubmitted).toLocaleDateString()}`);

    // Update user readings to match the latest shift's closing readings
    const updatedReadings = user.readings || [];

    for (const shiftReading of latestShift.readings) {
      const { fuelType, nozzle, closing } = shiftReading;
      const idx = updatedReadings.findIndex(r => r.fuelType === fuelType && r.nozzle === nozzle);
      const syncedClosing = roundHalfUp(closing || 0, 2);

      if (idx !== -1) {
        updatedReadings[idx].closing = syncedClosing;
      } else {
        updatedReadings.push({
          fuelType,
          nozzle,
          closing: syncedClosing
        });
      }
    }

    // Ensure all readings are properly rounded and non-negative
    updatedReadings.forEach(reading => {
      reading.closing = roundHalfUp(reading.closing || 0, 2);
      if (reading.closing < 0) reading.closing = 0;
    });

    user.readings = updatedReadings;
    await user.save();
    console.log(`✅ User readings synchronized with latest ${latestShift.timeType} shift successfully`);

  } catch (error) {
    console.error('❌ Error synchronizing user readings:', error);
  }
};

// SUBMIT Shift
const submitShift = async (req, res) => {
  const { shift, creditSales = [], creditBack = [] } = req.body;
  const { sales, readings, dayRate, lubeSales = [], nozzleTesting = [] } = shift;

  try {
    // Validate required fields
    if (!shift.submittedByName || !shift.timeType || !readings || !dayRate) {
      return res.status(400).json({ error: 'Missing required shift data.' });
    }

    // Validate shift date
    if (!shift.date) {
      return res.status(400).json({ error: 'Shift date is required.' });
    }

    // Validate readings
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'At least one reading is required.' });
    }

    for (const reading of readings) {
      if (!reading.fuelType || reading.opening == null || reading.closing == null) {
        return res.status(400).json({ error: 'All readings must have fuelType, opening, and closing values.' });
      }

      // Ensure readings are valid numbers
      const opening = Number(reading.opening);
      const closing = Number(reading.closing);

      if (isNaN(opening) || isNaN(closing) || opening < 0 || closing < 0) {
        return res.status(400).json({ error: 'Opening and closing readings must be valid non-negative numbers.' });
      }

      if (closing < opening) {
        return res.status(400).json({ error: `Closing reading (${closing}) cannot be less than opening reading (${opening}) for ${reading.fuelType} nozzle ${reading.nozzle}.` });
      }

      // Ensure nozzle is a valid number
      if (reading.nozzle == null || isNaN(Number(reading.nozzle)) || Number(reading.nozzle) < 1) {
        return res.status(400).json({ error: 'Nozzle number must be a valid positive integer.' });
      }
    }

    // Sanitize and validate sales numbers (monetary values)
    const sanitizedSales = {};
    const expectedSalesFields = [
      'cashInHand', 'cashWithManager', 'qrTransfer', 'card', 'cheques',
      'creditSalesTotal', 'creditBackTotal', 'lost'
    ];

    for (const [key, val] of Object.entries(sales)) {
      const numVal = Number(val);
      if (isNaN(numVal) || !isFinite(numVal)) {
        sanitizedSales[key] = 0;
      } else if (numVal < 0) {
        return res.status(400).json({ error: `Sales values cannot be negative: ${key}` });
      } else {
        sanitizedSales[key] = roundHalfUp(numVal, 2);
      }
    }

    // Ensure all expected fields exist with default values
    expectedSalesFields.forEach(field => {
      if (!(field in sanitizedSales)) {
        sanitizedSales[field] = 0;
      }
    });

    // Calculate fuel revenue with proper rounding
    let fuelRevenue = 0;
    for (const reading of readings) {
      const { fuelType, opening, closing } = reading;
      const rate = roundHalfUp(toSafeNumber(dayRate[fuelType] || 0), 2);
      const netVolume = safeSubtract(closing, opening);
      fuelRevenue = safeAdd(fuelRevenue, safeMultiply(netVolume, rate));
    }

    // Calculate lube revenue with proper rounding
    const lubeRevenue = roundHalfUp(lubeSales.reduce(
      (sum, l) => safeAdd(sum, toSafeNumber(l.amount || 0)), 0), 2);

    // Calculate credit back total with proper rounding
    const creditBackTotal = roundHalfUp(creditBack.reduce(
      (sum, p) => safeAdd(sum, toSafeNumber(p.amount || 0)), 0), 2);

    const lost = roundHalfUp(toSafeNumber(sanitizedSales.lost || 0), 2);

    const total = roundHalfUp(safeAdd(safeAdd(fuelRevenue, lubeRevenue), creditBackTotal), 2);

    // Use the shift date from the form instead of today's date
    const shiftDateISO = shift.date; // This should be in YYYY-MM-DD format from the form

    // Create a proper Date object for the shift date (set to noon UTC to avoid timezone issues)
    const shiftDate = new Date(shiftDateISO + 'T12:00:00.000Z');

    // Prepare shift data with proper rounding
    const shiftData = {
      submittedByName: shift.submittedByName,
      timeType: shift.timeType,
      shiftDateSubmitted: shiftDate, // Use the specified shift date instead of current timestamp
      sales: sanitizedSales,
      readings: readings,
      dayRate: Object.fromEntries(
        Object.entries(dayRate).map(([key, val]) => [key, roundHalfUp(toSafeNumber(val || 0), 2)])
      ),
      lubeSales: lubeSales.map(l => ({
        description: l.description,
        quantity: toSafeNumber(l.quantity || 0),
        amount: roundHalfUp(toSafeNumber(l.amount || 0), 2),
      })),
      nozzleTesting: nozzleTesting.map(nt => ({
        fuelType: nt.fuelType,
        quantity: toSafeNumber(nt.quantity || 0)
      })),
      user: req.user._id,
      creditSales: [],
      creditBack: []
    };

    // Process credit sales with proper rounding
    const creditSalePromises = creditSales.map(async (d) => {
      const account = await DefPayAccount.findOne({ code: d.code });
      if (!account) throw new Error(`Account with code ${d.code} not found.`);

      const amount = roundHalfUp(Number(d.amount || 0), 2);
      const fuelType = d.fuelType;
      const rate = roundHalfUp(toSafeNumber(dayRate[fuelType] || 0), 2);
      const quantity = rate > 0 ? roundHalfUp(amount / rate, 2) : 0;

      return {
        code: d.code,
        actName: account.firstName + ' ' + account.lastName,
        type: 'creditSale',
        amount: amount,
        description: d.description || '',
        user: req.user._id,
        defPayAccount: account._id,
        submittedByName: shift.submittedByName,
        orderDate: shiftDate, // Use the shift date object instead of creating new Date
        dueDate: new Date(d.dueDate),
        fuelType: fuelType,
        quantity: quantity
      };
    });

    // Process credit backs
    const creditBackPromises = creditBack.map(async (p) => {
      const account = await DefPayAccount.findOne({ code: p.code });
      if (!account) throw new Error(`Account with code ${p.code} not found.`);

      return {
        code: p.code,
        actName: account.firstName + ' ' + account.lastName,
        type: 'creditBack',
        amount: roundHalfUp(Number(p.amount || 0), 2),
        note: p.note || '',
        user: req.user._id,
        defPayAccount: account._id,
        submittedByName: shift.submittedByName,
        orderDate: shiftDate, // Use the shift date object instead of creating new Date
        paymentType: p.paymentType
      };
    });

    // Execute all operations in a transaction
    const result = await withTransactionRetry(async (session) => {
      // Create credit sales
      const createdCreditSales = await Promise.all(creditSalePromises);
      const creditSalesDocs = await DefPayOrder.insertMany(createdCreditSales, { session });

      // Create credit backs
      const createdCreditBacks = await Promise.all(creditBackPromises);
      const creditBackDocs = await DefPayOrder.insertMany(createdCreditBacks, { session });

      // Update shift data with order references
      shiftData.creditSales = creditSalesDocs.map(doc => doc._id);
      shiftData.creditBack = creditBackDocs.map(doc => doc._id);

      // Calculate totals with proper rounding
      shiftData.sales.creditSalesTotal = roundHalfUp(
        creditSalesDocs.reduce((sum, doc) => safeAdd(sum, doc.amount), 0), 2);
      shiftData.sales.creditBackTotal = roundHalfUp(
        creditBackDocs.reduce((sum, doc) => safeAdd(sum, doc.amount), 0), 2);

      // Create shift
      const shiftDoc = new Shift(shiftData);
      await shiftDoc.save({ session });

      // Update order documents with shift reference
      await DefPayOrder.updateMany(
        { _id: { $in: [...creditSalesDocs.map(d => d._id), ...creditBackDocs.map(d => d._id)] } },
        { $set: { shiftId: shiftDoc._id } },
        { session }
      );

      // Update account balances
      for (const creditSale of creditSalesDocs) {
        await DefPayAccount.findByIdAndUpdate(
          creditSale.defPayAccount,
          {
            $inc: { balance: creditSale.amount },
            $push: {
              paymentHistory: {
                defPayOrder: creditSale._id,
                amount: creditSale.amount,
                type: 'debit',
                date: new Date()
              }
            }
          },
          { session }
        );
      }

      for (const creditBack of creditBackDocs) {
        await DefPayAccount.findByIdAndUpdate(
          creditBack.defPayAccount,
          {
            $inc: { balance: -creditBack.amount },
            $push: {
              paymentHistory: {
                defPayOrder: creditBack._id,
                amount: creditBack.amount,
                type: 'credit',
                date: new Date()
              }
            }
          },
          { session }
        );
      }

      return shiftDoc;
    });

    // Update user's readings outside transaction
    const userDoc = await User.findById(req.user._id);
    if (userDoc) {
      await updateUserReadings(userDoc, readings, 'update');

      // Double-check synchronization with latest shift to ensure accuracy
      await synchronizeUserReadings(req.user._id);
    } else {
      console.log('❌ User document not found');
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
      { $set: { shiftId: result._id } }
    );

    // Fetch those orders
    const linkedOrders = await DefPayOrder.find({
      user: req.user._id,
      shiftId: result._id,
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

      if (!result[key].some(id => id.toString() === order._id.toString())) {
        result[key].push(order._id);
        result.sales[salesKey] = roundHalfUp(safeAdd(result.sales[salesKey] || 0, order.amount), 2);
      }
    }

    await result.save();

    console.log(`✅ Shift submitted successfully. Linked ${updatedOrders.modifiedCount} existing orders.`);

    res.status(201).json({
      message: 'Shift submitted successfully!',
      shift: result,
      linkedOrdersCount: updatedOrders.modifiedCount
    });

  } catch (error) {
    console.error('❌ Shift submission error:', error);
    res.status(500).json({
      error: 'Failed to submit shift.',
      details: error.message
    });
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

    // Store original readings for comparison
    const originalReadings = shift.readings || [];

    // Sanitize sales data if provided
    if (sales) {
      const sanitizedSales = {};
      const expectedSalesFields = [
        'cashInHand', 'cashWithManager', 'qrTransfer', 'card', 'cheques',
        'creditSalesTotal', 'creditBackTotal', 'lost'
      ];

      for (const [key, val] of Object.entries(sales)) {
        const numVal = Number(val);
        if (isNaN(numVal) || !isFinite(numVal)) {
          sanitizedSales[key] = 0;
        } else if (numVal < 0) {
          return res.status(400).json({ error: `Sales values cannot be negative: ${key}` });
        } else {
          sanitizedSales[key] = roundHalfUp(numVal, 2);
        }
      }

      // Ensure all expected fields exist with default values
      expectedSalesFields.forEach(field => {
        if (!(field in sanitizedSales)) {
          sanitizedSales[field] = shift.sales[field] || 0;
        }
      });

      shift.sales = sanitizedSales;
    }

    if (readings) shift.readings = readings;
    if (dayRate) shift.dayRate = dayRate;
    if (req.body.lubeSales) shift.lubeSales = req.body.lubeSales;
    if (req.body.nozzleTesting) shift.nozzleTesting = req.body.nozzleTesting;

    await shift.save();

    // Update user readings if readings were modified
    if (readings) {
      const userDoc = await User.findById(shift.user);
      if (userDoc) {
        await updateUserReadings(userDoc, readings, 'update');

        // Synchronize with latest shift to ensure accuracy
        await synchronizeUserReadings(shift.user);
      }
    }

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

    // Find all associated orders before deleting them
    const associatedOrders = await DefPayOrder.find({ shiftId: id });
    console.log(`🔍 Found ${associatedOrders.length} associated orders to delete`);

    // Delete associated orders and update account balances
    for (const order of associatedOrders) {
      // Update associated account balance
      const account = await DefPayAccount.findById(order.defPayAccount);
      if (account) {
        // Revert the balance changes
        if (order.type === 'creditBack') {
          account.balance -= order.amount; // Customer had paid back, so reduce balance
        } else if (order.type === 'creditSale') {
          account.balance += order.amount; // Customer had credit, so increase balance
        }

        // Remove from payment history
        account.paymentHistory = account.paymentHistory.filter(
          entry => entry.defPayOrder.toString() !== order._id.toString()
        );

        await account.save();
        console.log(`✅ Updated account ${order.defPayAccount} balance for order ${order._id}`);
      }

      // Delete the order
      await DefPayOrder.findByIdAndDelete(order._id);
      console.log(`✅ Deleted order ${order._id}`);
    }

    // Revert fuel usage from user's readings
    if (Array.isArray(shift.readings)) {
      await updateUserReadings(user, shift.readings, 'revert');
    }

    await user.save();

    // Delete the shift
    await Shift.findByIdAndDelete(id);

    res.status(200).json({
      message: `✅ Shift deleted successfully. ${associatedOrders.length} associated orders were also deleted and account balances updated.`
    });

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
      .populate({ path: "creditBack", select: "amount code actName paymentType" })
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
      .populate({ path: "creditBack", select: "amount code actName paymentType" })
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

// SYNCHRONIZE User Readings
const synchronizeReadings = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Perform synchronization
    await synchronizeUserReadings(userId);

    // Fetch updated user to return current readings
    const updatedUser = await User.findById(userId).select('readings');

    res.status(200).json({
      message: '✅ User readings synchronized successfully.',
      readings: updatedUser.readings
    });

  } catch (error) {
    console.error('❌ Error synchronizing readings:', error);
    res.status(500).json({ error: 'Failed to synchronize readings.' });
  }
};

module.exports = {
  submitShift,
  updateShift,
  deleteShift,
  getShifts,
  getShift,
  synchronizeReadings
};
