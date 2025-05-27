require('dotenv').config();

// Validate environment variables
const validateEnv = require('./utils/validateEnv');
validateEnv();

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Route imports
const userRoutes = require('./routes/UserRoute');
const shiftRoutes = require('./routes/ShiftRoute');
const defPayAccountRoutes = require('./routes/DefPayAccountRoute');
const dayRateRoutes = require('./routes/DayRateRoute');
const defPayOrderRoutes = require('./routes/DefPayOrderRoute');

const app = express();
const PORT = process.env.PORT || 5001; // Added fallback port

// Trust proxy configuration - IMPORTANT for rate limiting behind proxies
// Set to true if behind a single proxy, or specify the number of proxies
app.set('trust proxy', true);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all API routes
app.use('/api', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // React default
  'http://localhost:5173',  // Vite default
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

app.use(cors());

// Middleware
app.use(express.json()); // Add size limit

// Health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/users', userRoutes); // Signup/Login
app.use('/api/shifts', shiftRoutes); // Shift submission
app.use('/api/defpayact', defPayAccountRoutes); // Deferral account creation
app.use('/api/dayrates', dayRateRoutes); // Daily price setting
app.use('/api/defpayorders', defPayOrderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// MongoDB Connection with retry logic
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`✅ Server listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Don't crash the server, just log the error
});

module.exports = app;
