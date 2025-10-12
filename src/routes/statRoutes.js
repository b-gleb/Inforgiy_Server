import express from 'express';
import makeStatController from '../controllers/statController.js';

export default function makeStatRoutes(database) {
  const router = express.Router();
  const statController = makeStatController(database);

  router.post('/stats', statController.stats);
  router.post('/stats/cumulative', statController.stats_cumulative);
  router.post('/stats/emptyDuties', statController.emptyDuties);
  router.post('/stats/takenDuties', statController.takenDuties);
  router.post('/stats/uniqueUsers', statController.uniqueUsers);

  return router;
}
