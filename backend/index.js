require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

// Route imports
const userRoutes = require('./routes/UserRoute');
const shiftRoutes = require('./routes/ShiftRoute');
const defPayAccountRoutes = require('./routes/DefPayAccountRoute');
const dayRateRoutes = require('./routes/DayRateRoute');
const defPayOrderRoutes = require('./routes/DefPayOrderRoute');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('🚀 Backend is running');
});

// Routes
app.use('/api/users', userRoutes); // Signup/Login
app.use('/api/shifts', shiftRoutes); // Shift submission
app.use('/api/defpayact', defPayAccountRoutes); // Deferral account creation
app.use('/api/dayrate', dayRateRoutes); // Daily price setting
app.use('/api/defpayorder', defPayOrderRoutes);


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
