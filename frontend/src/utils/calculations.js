/**
 * Calculate total fuel sold from readings
 * @param {Array} readings - Array of reading objects with opening and closing values
 * @returns {number} Total fuel sold
 */
export const calculateTotalFuelSold = (readings) => {
  return parseFloat(
    readings.reduce((sum, r) => sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0)), 0).toFixed(2)
  );
};

/**
 * Calculate total revenue from readings and day rates
 * @param {Object} readings - Grouped readings by fuel type
 * @param {Object} dayRate - Day rates for each fuel type
 * @returns {number} Total revenue
 */
export const calculateTotalRevenue = (readings, dayRate) => {
  return parseFloat(
    Object.entries(readings)
      .reduce((total, [fuelType, readings]) => {
        const rate = parseFloat(dayRate[fuelType] || 0);
        const volume = readings.reduce(
          (sum, r) => sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0)),
          0
        );
        return total + parseFloat((volume * rate).toFixed(2));
      }, 0)
      .toFixed(2)
  );
};

/**
 * Calculate total credit transactions
 * @param {Array} transactions - Array of credit sale or credit back transactions
 * @returns {number} Total amount
 */
export const calculateTotalCredit = (transactions = []) => {
  return parseFloat(
    transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2)
  );
};

/**
 * Calculate total sales breakdown
 * @param {Object} sales - Sales object containing different payment methods
 * @returns {Object} Breakdown of sales by payment method
 */
export const calculateSalesBreakdown = (sales = {}) => {
  const qrTransfer = parseFloat((sales.qrTransfer || 0).toFixed(2));
  const card = parseFloat((sales.card || 0).toFixed(2));
  const managerCash = parseFloat((sales.cashWithManager || 0).toFixed(2));
  const lost = parseFloat((sales.lost || 0).toFixed(2));
  const cashInHand = parseFloat((sales.cashInHand || 0).toFixed(2));
  const creditSalesTotal = parseFloat((sales.creditSalesTotal || 0).toFixed(2));
  const creditBackTotal = parseFloat((sales.creditBackTotal || 0).toFixed(2));

  return {
    qrTransfer,
    card,
    managerCash,
    lost,
    cashInHand,
    creditSalesTotal,
    creditBackTotal,
    total: qrTransfer + card + managerCash + cashInHand + creditSalesTotal - creditBackTotal - lost
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