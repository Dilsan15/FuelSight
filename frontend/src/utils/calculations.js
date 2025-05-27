import { toSafeNumber, safeAdd, safeSubtract, safeMultiply } from './numberUtils';

/**
 * Calculate total fuel sold from readings
 * @param {Array} readings - Array of reading objects with opening and closing values
 * @returns {number} Total fuel sold
 */
export const calculateTotalFuelSold = (readings) => {
  return readings.reduce((sum, r) => {
    const closing = toSafeNumber(r.closing);
    const opening = toSafeNumber(r.opening);
    return safeAdd(sum, safeSubtract(closing, opening));
  }, 0);
};

/**
 * Calculate total revenue from readings and day rates
 * @param {Object} readings - Grouped readings by fuel type
 * @param {Object} dayRate - Day rates for each fuel type
 * @param {Array} nozzleTesting - Array of calibration/testing fuel data (optional)
 * @returns {number} Total revenue adjusted for calibration fuel
 */
export const calculateTotalRevenue = (readings, dayRate, nozzleTesting = []) => {
  // Calculate base fuel revenue
  const baseRevenue = Object.entries(readings)
    .reduce((total, [fuelType, readings]) => {
      const rate = toSafeNumber(dayRate[fuelType]);
      const volume = readings.reduce(
        (sum, r) => {
          const closing = toSafeNumber(r.closing);
          const opening = toSafeNumber(r.opening);
          return safeAdd(sum, safeSubtract(closing, opening));
        },
        0
      );
      return safeAdd(total, safeMultiply(volume, rate));
    }, 0);

  // Calculate calibration fuel cost to subtract
  const calibrationCost = nozzleTesting.reduce((sum, testing) => {
    const rate = toSafeNumber(dayRate[testing.fuelType]);
    const quantity = toSafeNumber(testing.quantity);
    return safeAdd(sum, safeMultiply(quantity, rate));
  }, 0);

  // Return adjusted revenue
  return safeSubtract(baseRevenue, calibrationCost);
};

/**
 * Calculate total credit transactions
 * @param {Array} transactions - Array of credit sale or credit back transactions
 * @returns {number} Total amount
 */
export const calculateTotalCredit = (transactions = []) => {
  return transactions.reduce((sum, t) => {
    return safeAdd(sum, toSafeNumber(t.amount));
  }, 0);
};

/**
 * Calculate total sales breakdown
 * @param {Object} sales - Sales object containing different payment methods
 * @returns {Object} Breakdown of sales by payment method
 */
export const calculateSalesBreakdown = (sales = {}) => {
  const qrTransfer = toSafeNumber(sales.qrTransfer);
  const card = toSafeNumber(sales.card);
  const managerCash = toSafeNumber(sales.cashWithManager);
  const lost = toSafeNumber(sales.lost);
  const cashInHand = toSafeNumber(sales.cashInHand);
  const creditSalesTotal = toSafeNumber(sales.creditSalesTotal);
  const creditBackTotal = toSafeNumber(sales.creditBackTotal);

  const total = safeSubtract(
    safeAdd(
      safeAdd(qrTransfer, card),
      safeAdd(managerCash, safeAdd(cashInHand, creditSalesTotal))
    ),
    safeAdd(creditBackTotal, lost)
  );

  return {
    qrTransfer,
    card,
    managerCash,
    lost,
    cashInHand,
    creditSalesTotal,
    creditBackTotal,
    total
  };
};

/**
 * Group readings by fuel type
 * @param {Array} readings - Array of reading objects
 * @returns {Object} Readings grouped by fuel type
 */
export const groupReadingsByFuelType = (readings = []) => {
  return readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});
};

/**
 * Calculate Total Theoretical Sale (TTS)
 * TTS = Fuel Revenue + Lube Sales (Total Theoretical Sale)
 * Credit sales are tracked separately as they are IOUs, not immediate cash.
 * 
 * @param {number} fuelRevenue - Total fuel revenue (already adjusted for calibration)
 * @param {number} lubeRevenue - Total lube sales revenue
 * @returns {number} Total Theoretical Sale amount
 */
export const calculateTTS = (fuelRevenue, lubeRevenue = 0) => {
  return safeAdd(toSafeNumber(fuelRevenue), toSafeNumber(lubeRevenue));
};

/**
 * Calculate cash in hand based on TTS
 * Cash in Hand = TTS - (QR + Card + Manager Cash + Credit Sales + Lost)
 * Note: Credit sales are IOUs so they reduce the available cash
 * 
 * @param {number} tts - Total Theoretical Sale
 * @param {number} qrTransfer - QR transfer amount
 * @param {number} card - Card payment amount
 * @param {number} managerCash - Cash with manager amount
 * @param {number} creditSales - Credit sales (IOUs)
 * @param {number} lost - Lost/stolen amount
 * @returns {number} Calculated cash in hand
 */
export const calculateCashInHand = (tts, qrTransfer, card, managerCash, creditSales = 0, lost = 0) => {
  const paymentsAndDeductions = safeAdd(
    safeAdd(
      safeAdd(toSafeNumber(qrTransfer), toSafeNumber(card)),
      safeAdd(toSafeNumber(managerCash), toSafeNumber(creditSales))
    ),
    toSafeNumber(lost)
  );

  return safeSubtract(toSafeNumber(tts), paymentsAndDeductions);
}; 