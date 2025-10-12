import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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

  const limiterConfig = {
    standardHeaders: 'draft-8',
    legacyHeaders: false
  };

  const perMinuteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    ...limiterConfig
  });

  const perHourLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 1000,
    ...limiterConfig
  });

  app.use('/api', perMinuteLimiter, perHourLimiter);
  app.use('/api', makeDefaultRoutes(database));
  app.use('/api', makeRotaRoutes(database));
  app.use('/api', makeUserRoutes(database));
  app.use('/api', makeStatRoutes(database));

  return app;
}
