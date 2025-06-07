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
 * Safely converts a value to a number, preserving whole numbers and limiting decimals to 2 places
 * @param {string|number} value - The value to convert
 * @returns {number} - The converted number
 */
const toSafeNumber = (value) => {
    const num = Number(value || 0);
    if (isNaN(num)) return 0;

    // For whole numbers, return as-is to avoid any floating-point artifacts
    if (Number.isInteger(num)) {
        return num;
    }

    // For decimal numbers, only round if they have more than 2 decimal places
    const str = typeof value === 'string' ? value : num.toString();
    const decimalIndex = str.indexOf('.');

    if (decimalIndex === -1) {
        // No decimal point, it's a whole number
        return num;
    }

    const decimalPlaces = str.length - decimalIndex - 1;

    // If it has 2 or fewer decimal places, return as-is
    if (decimalPlaces <= 2) {
        return num;
    }

    // Otherwise, round to 2 decimal places
    return roundHalfUp(num, 2);
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