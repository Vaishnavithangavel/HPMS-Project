const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const initializeDatabase = require('./db/init-db');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Bootstrap Database then Start Server
async function startServer() {
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.warn('WARNING: Database initialization failed. The server will start, but database operations might fail.');
  }

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Hospital Patient Management System (HPMS) Backend`);
    console.log(` Running on port: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`==================================================`);
  });
}

startServer();
