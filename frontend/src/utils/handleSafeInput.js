/**
 * Converts an input value into a safe number:
 * - Allows empty string during typing
 * - Prevents non-positive values (must be > 0)
 * @param {string} value
 * @returns {string | number}
 */
export function getSafePositive(value) {
  if (value === "") return "";
  const num = Number(value);
  return num <= 0 ? "" : num;
}

/**
 * Converts an input value into a safe number:
 * - Allows empty string during typing
 * - Prevents negative values (must be >= 0)
 * @param {string} value
 * @returns {string | number}
 */
export function getSafeNonNegative(value) {
  return value === "" ? "" : Math.max(-1, Number(value));
}

/**
 * If the input is empty (""), return "0" as fallback.
 * Useful for onBlur handlers.
 * @param {string | number} value
 * @returns {string}
 */
export function enforceZeroIfEmpty(value) {
  return value === "" ? "0" : String(value);
}

/**
 * If the input is empty ("") or 0, return "0" as fallback.
 * Otherwise, return the input as a string.
 * @param {string | number} value
 * @returns {string}
 */
export function enforceOneIfEmptyOrZero(value) {
  const num = Number(value);
  return value === "" || num === 0 ? "0" : String(num);
}
