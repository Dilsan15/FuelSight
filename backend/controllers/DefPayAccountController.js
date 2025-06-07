const mongoose = require('mongoose');
const DefPayAccount = require('../models/DefPayAccountModel');
const DefPayOrder = require('../models/DefPayOrderModel');
const UsedCode = require('../models/UsedCodeModel');

// Helper validation functions
const isValidName = (name) => /^[A-Za-z]{2,}$/.test(name?.trim() || '');
const isValidPhone = (phone) =>
  /^(\+91[\s-]?|91[\s-]?|0)?[6-9]\d{9}$/.test(phone?.trim() || '');

// CREATE
const createDefPayAccount = async (req, res) => {
  const { firstName, lastName, phoneNumber, address, note } = req.body;


  if (!address?.trim()) return res.status(400).json({ error: 'Address is required.' });
  if (!phoneNumber?.trim()) return res.status(400).json({ error: 'Phone number is required.' });
  if (!isValidPhone(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number. Must be a valid 10-digit Indian number.' });
  }

  try {
    const normalizedPhone = '+91' + phoneNumber.trim().slice(-10);


    const firstLetter = firstName.trim()[0].toUpperCase();
    let code = req.body.code?.trim();

    if (code) {
      const expectedPrefix = `${firstLetter}-`;
      if (!code.startsWith(expectedPrefix)) {
        return res.status(400).json({
          error: `Custom code must start with "${expectedPrefix}"`
        });
      }

      // Check if code has ever been used (including deleted accounts)
      const usedCode = await UsedCode.findOne({ code });
      if (usedCode) {
        return res.status(400).json({
          error: usedCode.deletedAt
            ? 'Code was previously used by a deleted account and cannot be reused'
            : 'Code already exists in an active account'
        });
      }
    } else {
      // Generate default code: A-001, A-002, etc.
      // Check both existing accounts and used codes to find next available number
      const existingCodes = await UsedCode.find({
        code: { $regex: `^${firstLetter}-\\d{3}$`, $options: 'i' }
      }).select('code');

      const usedNumbers = existingCodes
        .map(usedCode => parseInt(usedCode.code.split('-')[1], 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      let nextNumber = 1;
      for (let i = 0; i < usedNumbers.length; i++) {
        if (usedNumbers[i] !== i + 1) {
          nextNumber = i + 1;
          break;
        }
        nextNumber = usedNumbers.length + 1;
      }

      code = `${firstLetter}-${String(nextNumber).padStart(3, '0')}`;
    }

    const account = await DefPayAccount.create({
      code,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: normalizedPhone,
      address: address.trim(),
      note: note?.trim() || ''
    });

    // Track this code as used
    await UsedCode.create({
      code,
      originalAccountId: account._id,
      deletedAt: null
    });

    res.status(201).json(account);
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
};

// UPDATE
const updateDefPayAccount = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const account = await DefPayAccount.findById(id);
    if (!account) return res.status(404).json({ error: 'Account not found.' });


    if (updates.phoneNumber) {

      const normalizedPhone = '+91' + updates.phoneNumber.trim().slice(-10);

      account.phoneNumber = normalizedPhone;
    }

    if (updates.firstName) account.firstName = updates.firstName.trim();
    if (updates.lastName) account.lastName = updates.lastName.trim();
    if (updates.address) account.address = updates.address.trim();
    if (updates.note) account.note = updates.note.trim();

    if (updates.code) {
      const newCode = updates.code.trim();

      // Check if the new code has ever been used (including deleted accounts)
      const usedCode = await UsedCode.findOne({ code: newCode });
      if (usedCode && usedCode.originalAccountId && usedCode.originalAccountId.toString() !== id) {
        return res.status(400).json({
          error: usedCode.deletedAt
            ? 'Code was previously used by a deleted account and cannot be reused'
            : 'Code already exists in another account'
        });
      }

      // Update the used code tracking if code is being changed
      if (account.code !== newCode) {
        // Mark old code as deleted (if it exists in UsedCode)
        await UsedCode.findOneAndUpdate(
          { code: account.code },
          { deletedAt: new Date() }
        );

        // Add new code to used codes
        await UsedCode.findOneAndUpdate(
          { code: newCode },
          {
            code: newCode,
            originalAccountId: new mongoose.Types.ObjectId(id),
            deletedAt: null
          },
          { upsert: true, new: true }
        );
      }

      account.code = newCode;
    }

    if (Array.isArray(updates.paymentHistory)) {
      for (const entry of updates.paymentHistory) {
        if (!entry.defPayOrder || typeof entry.amount !== 'number') {
          return res.status(400).json({ error: 'Invalid payment entry.' });
        }
        const exists = await DefPayOrder.findById(entry.defPayOrder);
        if (!exists) {
          return res.status(400).json({ error: `DefPayOrder not found: ${entry.defPayOrder}` });
        }
      }

      account.paymentHistory = updates.paymentHistory.map(p => ({
        defPayOrder: p.defPayOrder,
        amount: p.amount,
        date: p.date ? new Date(p.date) : new Date()
      }));
    }

    if (updates.balance !== undefined) {
      if (typeof updates.balance !== 'number' || updates.balance < 0) {
        return res.status(400).json({ error: 'Invalid balance value.' });
      }
      account.balance = updates.balance;
    }

    await account.save();

    // Update associated orders with new account information
    const updateFields = {};
    if (updates.firstName || updates.lastName) {
      updateFields.actName = `${account.firstName} ${account.lastName}`;
    }
    if (updates.code) {
      updateFields.code = account.code;
    }

    // Only update orders if there are fields to update
    if (Object.keys(updateFields).length > 0) {
      const updateResult = await DefPayOrder.updateMany(
        { defPayAccount: id },
        { $set: updateFields }
      );
      console.log(`✅ Updated ${updateResult.modifiedCount} orders with new account information`);
    }

    res.status(200).json(account);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update account.' });
  }
};

// DELETE
const deleteDefPayAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const account = await DefPayAccount.findByIdAndDelete(id);
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    // Mark the code as used by a deleted account to prevent reuse
    await UsedCode.findOneAndUpdate(
      { code: account.code },
      { deletedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
};
const getDefPayAccount = async (req, res) => {
  try {
    const account = await DefPayAccount.findById(req.params.id)
      .populate('paymentHistory.defPayOrder'); // 👈 This is essential
    if (!account) return res.status(404).json({ error: "Account not found" });

    res.status(200).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching account" });
  }
};


const getDefPayAccounts = async (req, res) => {

  // Convert and sanitize query parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = (req.query.search || '').trim();
  const searchBy = req.query.searchBy || 'all';
  const sortBy = ['balance', 'createdAt'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const order = req.query.order === 'asc' ? 1 : -1;

  // Determine searchable fields
  const fields = (() => {
    switch (searchBy) {
      case 'name': return ['firstName', 'lastName'];
      case 'code': return ['code'];
      case 'phone': return ['phoneNumber'];
      case 'address': return ['address'];
      case 'all':
      default: return ['firstName', 'lastName', 'code', 'phoneNumber', 'address'];
    }
  })();

  // Construct search query
  let query = {};
  if (search) {
    const words = search.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      const regex = new RegExp(words[0], 'i');
      query = { $or: fields.map(field => ({ [field]: regex })) };
    } else {
      query = {
        $and: words.map(word => {
          const regex = new RegExp(word, 'i');
          return { $or: fields.map(field => ({ [field]: regex })) };
        })
      };
    }
  }

  try {
    const total = await DefPayAccount.countDocuments(query);
    const accounts = await DefPayAccount.find(query)
      .populate('paymentHistory.defPayOrder')
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    const hasMore = page * limit < total;

    res.status(200).json({
      data: accounts,
      total,
      page,
      hasMore
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts.' });
  }
};


// SYNCHRONIZE SINGLE BALANCE
const synchronizeBalance = async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🔄 Starting balance synchronization for account ${id}...`);

    const account = await DefPayAccount.findById(id).populate('paymentHistory.defPayOrder');
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // Calculate balance from payment history
    const calculatedBalance = account.paymentHistory.reduce((sum, entry) => {
      return sum + (entry.amount || 0);
    }, 0);

    const oldBalance = account.balance;
    const wasUpdated = Math.abs(account.balance - calculatedBalance) > 0.01;

    if (wasUpdated) {
      account.balance = calculatedBalance;
      await account.save();
      console.log(`✅ Updated account ${account.code}: ${oldBalance} → ${calculatedBalance}`);
    } else {
      console.log(`✅ Account ${account.code} balance already correct: ${calculatedBalance}`);
    }

    res.status(200).json({
      message: wasUpdated ? `✅ Balance updated` : `✅ Balance already correct`,
      account: {
        code: account.code,
        oldBalance,
        newBalance: calculatedBalance,
        wasUpdated
      }
    });
  } catch (err) {
    console.error('❌ Synchronization error:', err);
    res.status(500).json({ error: 'Failed to synchronize balance.' });
  }
};

// SYNCHRONIZE ALL BALANCES
const synchronizeAllBalances = async (req, res) => {
  try {
    console.log('🔄 Starting balance synchronization for all accounts...');

    const accounts = await DefPayAccount.find({}).populate('paymentHistory.defPayOrder');
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const account of accounts) {
      try {
        // Calculate balance from payment history
        const calculatedBalance = account.paymentHistory.reduce((sum, entry) => {
          return sum + (entry.amount || 0);
        }, 0);

        // Update balance if it's different
        if (Math.abs(account.balance - calculatedBalance) > 0.01) { // Allow for small floating point differences
          const oldBalance = account.balance;
          account.balance = calculatedBalance;
          await account.save();

          console.log(`✅ Updated account ${account.code}: ${oldBalance} → ${calculatedBalance}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating account ${account.code}:`, error);
        errors.push(`${account.code}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`🎉 Synchronization complete: ${updatedCount} updated, ${errorCount} errors`);

    res.status(200).json({
      message: `✅ Balance synchronization complete`,
      totalAccounts: accounts.length,
      updatedAccounts: updatedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('❌ Synchronization error:', err);
    res.status(500).json({ error: 'Failed to synchronize balances.' });
  }
};

module.exports = {
  createDefPayAccount,
  updateDefPayAccount,
  deleteDefPayAccount,
  getDefPayAccounts,
  getDefPayAccount,
  synchronizeBalance,
  synchronizeAllBalances
};
