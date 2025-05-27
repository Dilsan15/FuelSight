/**
 * Utility functions for consistent number handling across the application
 */

/**
 * Safely converts a value to a number with 2 decimal places
 * @param {string|number} value - The value to convert
 * @returns {number} - The converted number
 */
export const toSafeNumber = (value) => {
    const num = Number(value || 0);
    return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
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
    return num.toFixed(decimals);
};

/**
 * Safely adds two numbers
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @returns {number} - The sum
 */
export const safeAdd = (a, b) => {
    return toSafeNumber(toSafeNumber(a) + toSafeNumber(b));
};

/**
 * Safely subtracts two numbers
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @returns {number} - The difference
 */
export const safeSubtract = (a, b) => {
    return toSafeNumber(toSafeNumber(a) - toSafeNumber(b));
};

/**
 * Safely multiplies two numbers
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @returns {number} - The product
 */
export const safeMultiply = (a, b) => {
    return toSafeNumber(toSafeNumber(a) * toSafeNumber(b));
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