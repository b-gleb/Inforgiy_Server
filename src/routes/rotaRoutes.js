import express from 'express';
import makeRotaController from '../controllers/rotaController.js';

export default function makeRotaRoutes(database) {
  const router = express.Router();
  const rotaController = makeRotaController(database);

  router.get('/rota', rotaController.rota);
  router.post('/updateRota', rotaController.updateRota);
  router.get('/userDuties', rotaController.userDuties);
  router.post('/addRotaMulti', rotaController.addRotaMulti);

  return router;
}
