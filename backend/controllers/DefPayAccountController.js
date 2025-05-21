const mongoose = require('mongoose');
const DefPayAccount = require('../models/DefPayAccountModel');
const DefPayOrder = require('../models/DefPayOrderModel');

// Helper validation functions
const isValidName = (name) => /^[A-Za-z]{2,}$/.test(name?.trim() || '');
const isValidPhone = (phone) =>
  /^(\+91[\s-]?|91[\s-]?|0)?[6-9]\d{9}$/.test(phone?.trim() || '');

// CREATE
const createDefPayAccount = async (req, res) => {
  const { firstName, lastName, phoneNumber, address, note } = req.body;

  if (!isValidName(firstName)) {
    return res.status(400).json({ error: 'First name must be at least 2 letters and contain only letters.' });
  }

  if (!address?.trim()) return res.status(400).json({ error: 'Address is required.' });
  if (!phoneNumber?.trim()) return res.status(400).json({ error: 'Phone number is required.' });
  if (!isValidPhone(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number. Must be a valid 10-digit Indian number.' });
  }

  try {
    const normalizedPhone = '+91' + phoneNumber.trim().slice(-10);
    const phoneExists = await DefPayAccount.findOne({ phoneNumber: normalizedPhone });
    if (phoneExists) return res.status(400).json({ error: 'Phone number already in use.' });

    const firstLetter = firstName.trim()[0].toUpperCase();
    let code = req.body.code?.trim();

    if (code) {
      const expectedPrefix = `${firstLetter}-`;
      if (!code.startsWith(expectedPrefix)) {
        return res.status(400).json({
          error: `Custom code must start with "${expectedPrefix}"`
        });
      }

      const codeExists = await DefPayAccount.findOne({ code });
      if (codeExists) {
        return res.status(400).json({ error: 'Code already in use.' });
      }
    } else {
      // Generate default code: A-001, A-002, etc.
      const existingAccounts = await DefPayAccount.find({
        code: { $regex: `^${firstLetter}-\\d{3}$`, $options: 'i' }
      }).select('code');

      const usedNumbers = existingAccounts
        .map(acc => parseInt(acc.code.split('-')[1], 10))
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

    if (updates.firstName && !isValidName(updates.firstName)) {
      return res.status(400).json({ error: 'Invalid first name.' });
    }
    if (updates.lastName && !isValidName(updates.lastName)) {
      return res.status(400).json({ error: 'Invalid last name.' });
    }
    if (updates.phoneNumber) {
      if (!isValidPhone(updates.phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number.' });
      }
      const normalizedPhone = '+91' + updates.phoneNumber.trim().slice(-10);
      const existing = await DefPayAccount.findOne({ phoneNumber: normalizedPhone });
      if (existing && existing._id.toString() !== id) {
        return res.status(400).json({ error: 'Phone number already in use.' });
      }
      account.phoneNumber = normalizedPhone;
    }

    if (updates.firstName) account.firstName = updates.firstName.trim();
    if (updates.lastName) account.lastName = updates.lastName.trim();
    if (updates.address) account.address = updates.address.trim();
    if (updates.note) account.note = updates.note.trim();

    if (updates.code) {
      const existingCode = await DefPayAccount.findOne({ code: updates.code.trim() });
      if (existingCode && existingCode._id.toString() !== id) {
        return res.status(400).json({ error: 'Code already in use.' });
      }
      account.code = updates.code.trim();
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
  const { page = 1, limit = 10, search = '', searchBy = 'all', sortBy = 'createdAt', order = 'desc' } = req.query;
  let query = {};

  const trimmedSearch = search.trim();

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

  if (trimmedSearch) {
    const words = trimmedSearch.split(/\s+/).filter(Boolean);
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

  const sortField = ['balance', 'createdAt'].includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;

  try {
    const total = await DefPayAccount.countDocuments(query);
    const accounts = await DefPayAccount.find(query)
      .populate('paymentHistory.defPayOrder')
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const hasMore = page * limit < total;

    res.status(200).json({
      data: accounts,
      total,
      page: Number(page),
      hasMore,
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts.' });
  }
};

module.exports = {
  createDefPayAccount,
  updateDefPayAccount,
  deleteDefPayAccount,
  getDefPayAccounts,
  getDefPayAccount
};
