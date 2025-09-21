import express from 'express';
import makeDefaultController from '../controllers/defaultController.js';

export default function makeDefaultRoutes(database) {
  const router = express.Router();
  const defaultController = makeDefaultController(database);

  router.get('/ping', defaultController.ping);
  router.post('/auth', defaultController.auth);

  return router;
};