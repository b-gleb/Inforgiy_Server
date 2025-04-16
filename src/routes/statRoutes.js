import express from 'express';
const router = express.Router();
import statController from '../controllers/statController.js';

router.post('/stats', statController.stats);

export default router;