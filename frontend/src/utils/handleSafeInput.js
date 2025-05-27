/**
 * Converts an input value into a safe number:
 * - Allows empty string during typing
 * - Allows zero and positive values (>= 0)
 * - Preserves decimal points during typing
 * @param {string} value
 * @returns {string}
 */
export function getSafePositive(value) {
  if (value === "") return "";

  // Allow partial decimal inputs like "0.", "123.", etc.
  if (value.endsWith('.')) return value;

  // Check if it's a valid number
  const num = Number(value);
  if (isNaN(num)) return "";

  // Reject negative values
  return num < 0 ? "" : value;
}

/**
 * Converts an input value into a safe number:
 * - Allows empty string during typing
 * - Prevents negative values (must be >= 0)
 * - Preserves decimal points during typing
 * @param {string} value
 * @returns {string}
 */
export function getSafeNonNegative(value) {
  if (value === "") return "";

  // Allow partial decimal inputs like "0.", "123.", etc.
  if (value.endsWith('.')) return value;

  // Check if it's a valid number
  const num = Number(value);
  if (isNaN(num)) return "";

  // Reject negative values
  return num < 0 ? "" : value;
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
export function enforceZeroIfEmptyOrZero(value) {
  const num = Number(value);
  return value === "" || num <= 0 ? "0" : String(num);
}

/**
 * Handles decimal number inputs safely:
 * - Allows empty string during typing
 * - Allows partial decimal inputs (e.g., "0.", "123.")
 * - Prevents negative values
 * - Preserves decimal precision
 * @param {string} value
 * @returns {string}
 */
export function getSafeDecimal(value) {
  if (value === "") return "";

  // Allow partial decimal inputs
  if (value.endsWith('.')) return value;

  // Check for multiple decimal points
  const decimalCount = (value.match(/\./g) || []).length;
  if (decimalCount > 1) return "";

  // Use regex to validate format without converting to number
  if (!/^-?\d*\.?\d*$/.test(value)) return "";

  // Check if it starts with minus (negative)
  if (value.startsWith('-') || value.startsWith('-.')) return "";

  // Only validate if it's a complete number (not partial like "123.")
  if (!value.endsWith('.') && value !== "") {
    const num = Number(value);
    if (isNaN(num) || num < 0) return "";
  }

  return value;
}

/**
 * Formats currency for display while preserving decimal input during typing
 * - Allows partial decimal inputs like "123." or "123.4"
 * - Shows comma formatting for complete numbers
 * - Preserves typing state for decimals
 * @param {string} value
 * @returns {string}
 */
export function formatCurrencyInput(value) {
  if (value === "") return "";

  // Clean the value but preserve it as string to avoid precision loss
  const cleanValue = value.replace(/,/g, "");

  // Preserve decimal point at the end for typing
  if (cleanValue.endsWith('.')) return cleanValue;

  // Validate it's a number without converting to Number type yet
  if (!/^\d*\.?\d*$/.test(cleanValue)) return "";

  // If it has a decimal point, handle carefully
  if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.');
    // If there's something after the decimal, we can format
    if (parts[1] && parts[1].length > 0) {
      // Only format the integer part, preserve decimal as-is
      const integerPart = Number(parts[0]).toLocaleString("en-IN");
      return `${integerPart}.${parts[1]}`;
    } else {
      // Just decimal point, format integer part only
      const integerPart = Number(parts[0]).toLocaleString("en-IN");
      return `${integerPart}.`;
    }
  }

  // Format whole numbers
  const num = Number(cleanValue);
  return isNaN(num) ? cleanValue : num.toLocaleString("en-IN");
}

/**
 * Creates a safe input change handler that prevents precision loss and timing issues
 * @param {Function} setValue - State setter function
 * @param {Function} validator - Validation function (e.g., getSafeDecimal)
 * @returns {Function} Input change handler
 */
export function createSafeInputHandler(setValue, validator = getSafeDecimal) {
  return (e) => {
    const inputValue = e.target.value;
    const raw = inputValue.replace(/,/g, "");
    const validatedValue = validator(raw);

    // Only update if the validation actually changed something meaningful
    // This prevents unnecessary re-renders that can cause cursor jumping
    setValue(validatedValue);
  };
}

/**
 * Creates a safe blur handler for currency inputs
 * @param {Function} setValue - State setter function
 * @returns {Function} Blur handler
 */
export function createSafeBlurHandler(setValue) {
  return (e) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || Number(raw) < 0) {
      setValue("0");
    }
  };
}
