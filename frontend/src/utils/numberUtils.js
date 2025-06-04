/**
 * Utility functions for consistent number handling across the application
 */

/**
 * Standard "round half up" rounding to specified decimal places
 * This ensures .5 always rounds up (e.g., 123.455 → 123.46)
 * @param {number} num - The number to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} - The rounded number
 */
export const roundHalfUp = (num, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
};

/**
 * Safely converts a value to a number with 2 decimal places using round half up
 * @param {string|number} value - The value to convert
 * @returns {number} - The converted number
 */
export const toSafeNumber = (value) => {
    const num = Number(value || 0);
    return isNaN(num) ? 0 : roundHalfUp(num, 2);
};

/**
 * Safely converts a value to a string representation of a number
 * @param {string|number} value - The value to convert
 * @returns {string} - The string representation
 */
export const toSafeString = (value) => {
    const num = toSafeNumber(value);
    return num.toString();
};

/**
 * Safely converts a value to a number for calculations
 * @param {string|number} value - The value to convert
 * @returns {number} - The converted number for calculations
 */
export const toCalculationNumber = (value) => {
    return toSafeNumber(value);
};

/**
 * Safely converts a value to a display string with proper formatting
 * @param {string|number} value - The value to convert
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - The formatted string
 */
export const toDisplayString = (value, decimals = 2) => {
    const num = toSafeNumber(value);
    return roundHalfUp(num, decimals).toFixed(decimals);
};

/**
 * Safely adds two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The sum rounded to 2 decimal places
 */
export const safeAdd = (a, b) => {
    return roundHalfUp(toSafeNumber(a) + toSafeNumber(b), 2);
};

/**
 * Safely subtracts two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The difference rounded to 2 decimal places
 */
export const safeSubtract = (a, b) => {
    return roundHalfUp(toSafeNumber(a) - toSafeNumber(b), 2);
};

/**
 * Safely multiplies two numbers with proper rounding
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - The product rounded to 2 decimal places
 */
export const safeMultiply = (a, b) => {
    return roundHalfUp(toSafeNumber(a) * toSafeNumber(b), 2);
};

/**
 * Safely divides two numbers
 * @param {string|number} a - Dividend
 * @param {string|number} b - Divisor
 * @returns {number} - The quotient
 */
export const safeDivide = (a, b) => {
    const divisor = toSafeNumber(b);
    if (divisor === 0) return 0;
    return toSafeNumber(toSafeNumber(a) / divisor);
}; 