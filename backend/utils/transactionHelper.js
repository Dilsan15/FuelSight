const mongoose = require('mongoose');

/**
 * Execute operations within a MongoDB transaction
 * @param {Function} operations - Async function containing operations to run in transaction
 * @returns {Promise} - Transaction result
 */
const withTransaction = async (operations) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const result = await operations(session);

        await session.commitTransaction();
        return result;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

/**
 * Execute operations with retry logic for transaction conflicts
 * @param {Function} operations - Async function containing operations 
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise} - Transaction result
 */
const withTransactionRetry = async (operations, maxRetries = 3) => {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            return await withTransaction(operations);
        } catch (error) {
            attempt++;

            // Check if it's a transient transaction error
            if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError') && attempt < maxRetries) {
                console.warn(`Transaction attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Exponential backoff
                continue;
            }

            throw error;
        }
    }
};

module.exports = {
    withTransaction,
    withTransactionRetry
}; 