import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// ROUTES
import defaultRoutes from './routes/defaultRoutes.js';
import rotaRoutes from './routes/rotaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statRoutes from './routes/statRoutes.js';

export default function makeApp(database) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', defaultRoutes);
  app.use('/api', rotaRoutes);
  app.use('/api', userRoutes);
  app.use('/api', statRoutes);

  return app;
};
