const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const applianceRoutes = require('./routes/appliances');
const seedRoutes = require('./routes/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/match_energy';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/seed', seedRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
