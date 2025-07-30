import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// ROUTES
import makeDefaultRoutes from './routes/defaultRoutes.js';
import makeRotaRoutes from './routes/rotaRoutes.js';
import makeUserRoutes from './routes/userRoutes.js';
import makeStatRoutes from './routes/statRoutes.js';

export default function makeApp(database) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', makeDefaultRoutes(database));
  app.use('/api', makeRotaRoutes(database));
  app.use('/api', makeUserRoutes(database));
  app.use('/api', makeStatRoutes(database));

  return app;
};
