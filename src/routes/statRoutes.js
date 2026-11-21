import express from 'express';
import makeStatController from '../controllers/statController.js';

export default function makeStatRoutes(database) {
  const router = express.Router();
  const statController = makeStatController(database);

  router.post('/stats', statController.stats);
  router.post('/stats/cumulative', statController.stats_cumulative);
  router.post(
    '/departments/:departmentSlug/statistics/empty-duties',
    statController.emptyDuties
  );
  router.post(
    '/departments/:departmentSlug/statistics/taken-duties',
    statController.takenDuties
  );

  return router;
}
