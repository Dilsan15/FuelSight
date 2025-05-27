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
      return res.status(400).json({ error: 'user must be selected for order submission.' });
    }

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number.' });
    }

    let shift = null;
    let orderDate = new Date();

    // For worker accounts, try to find an associated shift
    if (shiftDate) {
      const dateStart = new Date(shiftDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(shiftDate);
      dateEnd.setHours(23, 59, 59, 999);
      orderDate = new Date(shiftDate);

      shift = await Shift.findOne({
        user: userId,
        shiftDateSubmitted: { $gte: dateStart, $lte: dateEnd }
      });
    }

    const account = await DefPayAccount.findById(defPayAccount);
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    if (type === 'creditSale') {
      account.balance -= Number(amount);
    } else if (type === 'creditBack') {
      account.balance += Number(amount);
    }

    account.paymentHistory.push({
      defPayOrder: undefined,
      amount: type === 'creditSale' ? -Number(amount) : Number(amount),
      date: new Date()
    });

    const order = await DefPayOrder.create({
      user: userId,
      defPayAccount,
      type,
      amount,
      shiftId: shift ? shift._id : undefined,
      orderDate,
      paymentType: type === 'creditBack' ? paymentType : undefined,
      fuelType: type === 'creditSale' ? fuelType : undefined,
      quantity: type === 'creditSale' ? quantity : undefined,
      dueDate: type === 'creditSale' ? dueDate : undefined,
      submittedByName,
      description,
      code,
      actName: `${account.firstName} ${account.lastName}`
    });

    account.paymentHistory[account.paymentHistory.length - 1].defPayOrder = order._id;
    await account.save();

    if (shift) {
      const key = type === 'creditBack' ? 'creditBack' : 'creditSales';
      const salesKey = type === 'creditBack' ? 'creditBackTotal' : 'creditSalesTotal';

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
  console.log('🚀 UPDATE FUNCTION CALLED!');
  const { id } = req.params;
  console.log('🔍 Order ID received:', id);
  console.log('🔍 Request body:', req.body);

  const {
    userId,
    accountId,
    type,
    amount,
    shiftDate,
    paymentType,
    fuelType,
    quantity,
    dueDate,
    submittedByName,
    description
  } = req.body;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ Invalid ObjectId format:', id);
      return res.status(400).json({ error: 'Invalid order ID format.' });
    }

    console.log('🔍 Looking for order with ID:', id);
    const existingOrder = await DefPayOrder.findById(id);
    console.log('🔍 Found order:', existingOrder ? 'YES' : 'NO');

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const oldType = existingOrder.type;
    const oldAmount = existingOrder.amount;
    const newType = type;
    const newAmount = Number(amount);

    // === Update associated account
    console.log('🔍 Looking for old account:', existingOrder.defPayAccount);
    const oldAccount = await DefPayAccount.findById(existingOrder.defPayAccount);
    console.log('🔍 Old account found:', oldAccount ? 'YES' : 'NO');

    console.log('🔍 Looking for new account:', accountId);
    const newAccount = await DefPayAccount.findById(accountId);
    console.log('🔍 New account found:', newAccount ? 'YES' : 'NO');

    // Check if new account exists (required)
    if (!newAccount) {
      console.log('❌ New account not found, returning 404');
      return res.status(404).json({ error: 'New account not found.' });
    }

    // Old account might be deleted - that's okay, we'll handle it
    const oldAccountExists = !!oldAccount;

    // === Find associated shift based on user and shift date
    let newShift = null;
    if (shiftDate && userId) {
      const dateStart = new Date(shiftDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(shiftDate);
      dateEnd.setHours(23, 59, 59, 999);

      newShift = await Shift.findOne({
        user: userId,
        shiftDateSubmitted: { $gte: dateStart, $lte: dateEnd }
      });
    }

    // === Calculate balance changes properly ===
    const isSameAccount = oldAccountExists && oldAccount._id.toString() === newAccount._id.toString();

    if (isSameAccount) {
      // SAME ACCOUNT: Calculate the net change
      const oldEffect = oldType === 'creditBack' ? oldAmount : -oldAmount;
      const newEffect = newType === 'creditBack' ? newAmount : -newAmount;
      const netChange = newEffect - oldEffect;

      oldAccount.balance += netChange;

      // Update payment history: remove old entry and add new one
      oldAccount.paymentHistory = oldAccount.paymentHistory.filter(
        entry => entry.defPayOrder.toString() !== id
      );
      oldAccount.paymentHistory.push({
        amount: newType === 'creditBack' ? newAmount : -newAmount,
        date: new Date(),
        defPayOrder: id
      });

      await oldAccount.save();
      console.log(`✅ Updated same account balance by ${netChange}`);

    } else {
      // DIFFERENT ACCOUNTS OR OLD ACCOUNT DELETED

      if (oldAccountExists) {
        // Revert old account balance (only if old account still exists)
        if (oldType === 'creditBack') {
          oldAccount.balance -= oldAmount; // Revert: customer had paid back, so reduce balance
        } else if (oldType === 'creditSale') {
          oldAccount.balance += oldAmount; // Revert: customer had credit, so increase balance
        }

        // Remove from old account payment history
        oldAccount.paymentHistory = oldAccount.paymentHistory.filter(
          entry => entry.defPayOrder.toString() !== id
        );

        await oldAccount.save();
        console.log(`✅ Reverted balance from old account ${oldAccount._id}`);
      } else {
        console.log(`⚠️ Old account was deleted - skipping balance reversion`);
      }

      // Apply new account balance
      if (newType === 'creditBack') {
        newAccount.balance += newAmount;  // Customer paying back debt
      } else if (newType === 'creditSale') {
        newAccount.balance -= newAmount;  // Customer getting more credit
      }

      // Add to new account payment history
      newAccount.paymentHistory.push({
        amount: newType === 'creditBack' ? newAmount : -newAmount,
        date: new Date(),
        defPayOrder: id
      });

      await newAccount.save();
      console.log(`✅ Applied balance to new account ${newAccount._id}`);
    }

    // === Handle shift updates ===
    const oldShiftId = existingOrder.shiftId?.toString();
    const newShiftId = newShift?._id?.toString();

    console.log('🔍 SHIFT DEBUG:');
    console.log('- Existing order shiftId:', existingOrder.shiftId);
    console.log('- Old shift ID (string):', oldShiftId);
    console.log('- New shift found:', newShift ? 'YES' : 'NO');
    console.log('- New shift ID (string):', newShiftId);
    console.log('- User ID from request:', userId);
    console.log('- Shift date from request:', shiftDate);

    const salesKeyOld = oldType === 'creditBack' ? 'creditBackTotal' : 'creditSalesTotal';
    const salesKeyNew = newType === 'creditBack' ? 'creditBackTotal' : 'creditSalesTotal';

    // Check if this is the same shift
    const isSameShift = oldShiftId && newShiftId && oldShiftId === newShiftId;
    console.log('- Is same shift?', isSameShift);

    if (isSameShift) {
      // SAME SHIFT: Just update the totals and handle type changes
      const shift = await Shift.findById(oldShiftId);
      if (shift) {
        // Ensure sales field exists
        if (!shift.sales) shift.sales = {};

        // Update totals: subtract old amount, add new amount
        shift.sales[salesKeyOld] = Math.max(0, (shift.sales[salesKeyOld] || 0) - oldAmount);
        shift.sales[salesKeyNew] = (shift.sales[salesKeyNew] || 0) + newAmount;

        // Handle type changes within same shift
        if (oldType !== newType) {
          const oldKey = oldType === 'creditBack' ? 'creditBack' : 'creditSales';
          const newKey = newType === 'creditBack' ? 'creditBack' : 'creditSales';

          // Remove from old type array and add to new type array
          shift[oldKey] = shift[oldKey].filter(oId => oId.toString() !== id);
          if (!shift[newKey].includes(id)) {
            shift[newKey].push(id);
          }
        }
        // If type is the same, order stays in the same array - no need to move it

        await shift.save();
        console.log(`✅ Updated order ${id} in same shift ${oldShiftId}`);
      }
    } else {
      // DIFFERENT SHIFTS: Remove from old, add to new

      // Step 1: Remove from old shift if it exists
      if (oldShiftId) {
        const oldShift = await Shift.findById(oldShiftId);
        if (oldShift) {
          const oldKey = oldType === 'creditBack' ? 'creditBack' : 'creditSales';

          // Remove order from old shift's array
          oldShift[oldKey] = oldShift[oldKey].filter(oId => oId.toString() !== id);

          // Remove old amount from totals
          if (!oldShift.sales) oldShift.sales = {};
          oldShift.sales[salesKeyOld] = Math.max(0, (oldShift.sales[salesKeyOld] || 0) - oldAmount);

          await oldShift.save();
          console.log(`✅ Removed order ${id} from old shift ${oldShiftId}`);
        }
      }

      // Step 2: Add to new shift if it exists
      if (newShift) {
        const newKey = newType === 'creditBack' ? 'creditBack' : 'creditSales';

        // Add order to new shift's array (if not already there)
        if (!newShift[newKey].includes(id)) {
          newShift[newKey].push(id);
        }

        // Add new amount to totals
        if (!newShift.sales) newShift.sales = {};
        newShift.sales[salesKeyNew] = (newShift.sales[salesKeyNew] || 0) + newAmount;

        await newShift.save();
        console.log(`✅ Added order ${id} to new shift ${newShiftId}`);
      }
    }

    // Update the order with fresh account information
    const updatePayload = {
      user: userId,
      defPayAccount: accountId,
      type: newType,
      amount: newAmount,
      shiftId: newShift?._id || existingOrder.shiftId, // Keep existing shiftId if no new shift found
      submittedByName,
      description,
      orderDate: shiftDate ? new Date(shiftDate) : existingOrder.orderDate,
      // Update account-related fields with fresh data
      code: newAccount.code,
      actName: `${newAccount.firstName} ${newAccount.lastName}`,
      paymentType: newType === 'creditBack' ? paymentType : undefined,
      fuelType: newType === 'creditSale' ? fuelType : undefined,
      quantity: newType === 'creditSale' ? quantity : undefined,
      dueDate: newType === 'creditSale' ? dueDate : undefined
    };

    const updatedOrder = await DefPayOrder.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true
    });

    console.log(`✅ Order ${id} updated successfully`);
    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
};

// DELETE
const deleteDefPayOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await DefPayOrder.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // === Update associated shift BEFORE deleting the order
    if (order.shiftId) {
      const shift = await Shift.findById(order.shiftId);
      if (shift) {
        const key = order.type === 'creditBack' ? 'creditBack' : 'creditSales';
        const salesKey = order.type === 'creditBack' ? 'creditBackTotal' : 'creditSalesTotal';

        // Remove from payments or deferrals list
        shift[key] = shift[key].filter(oId => oId.toString() !== id);

        // Ensure sales field exists
        if (!shift.sales) shift.sales = {};

        // Subtract amount safely
        shift.sales[salesKey] = Math.max(0, (shift.sales[salesKey] || 0) - order.amount);

        await shift.save();
        console.log(`✅ Removed order ${id} from shift ${order.shiftId}`);
      }
    }

    // === Update associated account
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
        entry => entry.defPayOrder.toString() !== id
      );

      await account.save();
      console.log(`✅ Updated account ${order.defPayAccount} balance`);
    }

    // Now delete the order
    await DefPayOrder.findByIdAndDelete(id);
    console.log(`✅ Order ${id} deleted successfully`);

    res.status(200).json({ message: '✅ Order deleted and shift/account updated.' });
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

  if (type === 'creditSale' || type === 'creditBack') {
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
