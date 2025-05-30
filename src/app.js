import dotenv from 'dotenv';
dotenv.config();

// APP
import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
import defaultRoutes from './routes/defaultRoutes.js';
import rotaRoutes from './routes/rotaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statRoutes from './routes/statRoutes.js';

app.use('/api', defaultRoutes);
app.use('/api', rotaRoutes);
app.use('/api', userRoutes);
app.use('/api', statRoutes);

export default app;
