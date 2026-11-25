import express from 'express';
import makeRotaController from '../controllers/rotaController.js';
import { authenticate } from '../middleware/auth.js';

export default function makeRotaRoutes(database) {
  const router = express.Router();
  const rotaController = makeRotaController(database);

  router.get('/rota', rotaController.rota);
  router.post('/updateRota', authenticate, rotaController.updateRota);
  router.get('/userDuties', rotaController.userDuties);
  router.post('/addRotaMulti', authenticate, rotaController.addRotaMulti);
  router.post('/removeRotaMulti', authenticate, rotaController.removeRotaMulti);

  return router;
}
