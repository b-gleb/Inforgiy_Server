require('dotenv').config();

// APP
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
const defaultRoutes = require('./routes/defaultRoutes');
const rotaRoutes = require('./routes/rotaRoutes');
const userRoutes = require('./routes/userRoutes');
const statRoutes = require('./routes/statRoutes');

app.use('/api', defaultRoutes);
app.use('/api', rotaRoutes);
app.use('/api', userRoutes);
app.use('/api', statRoutes);

module.exports = app;
