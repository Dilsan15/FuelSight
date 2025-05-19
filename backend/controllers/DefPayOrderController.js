const mongoose = require('mongoose');
const DefPayOrder = require('../models/DefPayOrderModel');

// CREATE
const createDefPayOrder = async (req, res) => {
  try {
    const order = await DefPayOrder.create(req.body);
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
    const order = await DefPayOrder.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.status(200).json(order);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
};

// DELETE
const deleteDefPayOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await DefPayOrder.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.status(200).json({ message: 'Order deleted.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete order.' });
  }
};

// GET ONE
const getDefPayOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await DefPayOrder.findById(id).populate('user defPayAccount shiftId');
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.status(200).json(order);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
};

const getDefPayOrders = async (req, res) => {
  const { page = 1, limit = 10, search = '', type } = req.query;

  const query = {};
  const trimmedSearch = search.trim();

  if (type === 'deferal' || type === 'payment') {
    query.type = type;
  }

  // Direct filters
  const dueInMatch = trimmedSearch.match(/duein:(\d+)/);
  if (dueInMatch) {
    const days = parseInt(dueInMatch[1]);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    query.dueDate = { $lte: targetDate };
  }

  if (/\bunpaid\b/i.test(trimmedSearch)) query.status = 'unpaid';
  if (/\bpartial\b/i.test(trimmedSearch)) query.status = 'partial';
  if (/\bpaid\b/i.test(trimmedSearch)) query.status = 'paid';

  const fuelMatch = trimmedSearch.match(/\b(HSD|MS|XG)\b/i);
  if (fuelMatch) query.fuelType = fuelMatch[1];

  const payMatch = trimmedSearch.match(/\b(QR|Card|Cash)\b/i);
  if (payMatch) query.paymentType = payMatch[1];

  // Fuzzy search
  const plainSearch = trimmedSearch.replace(/duein:\d+|\bunpaid\b|\bpartial\b|\bpaid\b|\b(HSD|MS|XG)\b|\b(QR|Card|Cash)\b/gi, '').trim();

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
      .populate('user defPayAccount shiftId')
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
  