/**
 * Backend utility functions for consistent number handling
 */

/**
 * Standard "round half up" rounding to specified decimal places
 * This ensures .5 always rounds up (e.g., 123.455 → 123.46)
 * @param {number} num - The number to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} - The rounded number
 */
const roundHalfUp = (num, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
};

/**
 * Safely converts a value to a number with 2 decimal places using round half up
 * @param {string|number} value - The value to convert
 * @returns {number} - The converted number
 */
const toSafeNumber = (value) => {
    const num = Number(value || 0);
    return isNaN(num) ? 0 : roundHalfUp(num, 2);
};

/**
 * Safely adds two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The sum rounded to 2 decimal places
 */
const safeAdd = (a, b) => {
    return roundHalfUp(toSafeNumber(a) + toSafeNumber(b), 2);
};

/**
 * Safely subtracts two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The difference rounded to 2 decimal places
 */
const safeSubtract = (a, b) => {
    return roundHalfUp(toSafeNumber(a) - toSafeNumber(b), 2);
};

/**
 * Safely multiplies two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The product rounded to 2 decimal places
 */
const safeMultiply = (a, b) => {
    return roundHalfUp(toSafeNumber(a) * toSafeNumber(b), 2);
};

module.exports = {
    roundHalfUp,
    toSafeNumber,
    safeAdd,
    safeSubtract,
    safeMultiply
}; 