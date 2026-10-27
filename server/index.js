const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Database.'))
  .catch((err) => {
    console.error('MongoDB Connection Error: ', err.message);
    process.exit(1);
  });

// Route Mounts
app.use('/api/auth', require('./routes/auth'));
app.use('/api/election', require('./routes/election'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Unilorin Physio Portal API live' });
});

app.listen(PORT, () => {
  console.log(`Server executing on port ${PORT}`);
});