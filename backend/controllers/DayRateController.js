const DayRate = require('../models/DayRateModel');

// CREATE day rate
const createDayRate = async (req, res) => {
  const { rates } = req.body;

  if (!rates || typeof rates !== 'object' || rates.XG == null || rates.HSD == null || rates.MS == null) {
    return res.status(400).json({ error: 'Rates for XG, HSD, and MS are required.' });
  }

  try {
    const dayRate = await DayRate.create({
      setBy: req.user._id,
      rates
    });

    res.status(201).json(dayRate);
  } catch (err) {
    console.error('Day rate creation error:', err);
    res.status(500).json({ error: 'Failed to set day rate.' });
  }
};

// UPDATE day rate by ID
const updateDayRate = async (req, res) => {
  const { id } = req.params;
  const { rates } = req.body;

  if (!rates || typeof rates !== 'object') {
    return res.status(400).json({ error: 'Updated rates must be provided.' });
  }

  try {
    const dayRate = await DayRate.findById(id);
    if (!dayRate) {
      return res.status(404).json({ error: 'Day rate not found.' });
    }

    if (rates.XG != null) dayRate.rates.XG = rates.XG;
    if (rates.HSD != null) dayRate.rates.HSD = rates.HSD;
    if (rates.MS != null) dayRate.rates.MS = rates.MS;

    await dayRate.save();
    res.status(200).json(dayRate);
  } catch (err) {
    console.error('Day rate update error:', err);
    res.status(500).json({ error: 'Failed to update day rate.' });
  }
};

// DELETE day rate by ID
const deleteDayRate = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await DayRate.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Day rate not found.' });
    }

    res.status(200).json({ message: 'Day rate deleted successfully.' });
  } catch (err) {
    console.error('Day rate deletion error:', err);
    res.status(500).json({ error: 'Failed to delete day rate.' });
  }
};

// GET day rates with optional date filtering and pagination
const getDayRatesWithFilters = async (req, res) => {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const { start, end } = req.query;
  
    const filter = {};
  
    // Apply date range filter if provided
    if (start || end) {
      filter.createdAt = {};
      if (start) filter.createdAt.$gte = new Date(start);
      if (end) filter.createdAt.$lte = new Date(end);
    }
  
    try {
      const dayRates = await DayRate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('setBy', 'username');
  
      const totalCount = await DayRate.countDocuments(filter);
  
      res.status(200).json({ total: totalCount, results: dayRates });
    } catch (err) {
      console.error('Day rate fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch day rates.' });
    }
  };
  
// GET the most recent day rate (latest one created)
const getLatestDayRate = async (req, res) => {
    try {
      const latest = await DayRate.findOne()
        .sort({ createdAt: -1 }) // newest first
        .populate('setBy', 'username');
  
      if (!latest) {
        return res.status(404).json({ error: 'No day rate found.' });
      }
  
      res.status(200).json(latest);
    } catch (err) {
      console.error('Error fetching latest day rate:', err);
      res.status(500).json({ error: 'Failed to fetch latest day rate.' });
    }
};
  




module.exports = {
  createDayRate,
  updateDayRate,
  deleteDayRate,
  getDayRatesWithFilters,
  getLatestDayRate
};
