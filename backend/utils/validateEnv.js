/**
 * Validate required environment variables
 */
const validateEnv = () => {
    const required = ['MONGO_URI', 'JWT_SECRET'];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        process.exit(1);
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET should be at least 32 characters long');
        process.exit(1);
    }

    console.log('✅ Environment variables validated');
};

module.exports = validateEnv; 