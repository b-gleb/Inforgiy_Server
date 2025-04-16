import express from 'express';
const router = express.Router();
import rotaController from '../controllers/rotaController.js';

router.get('/rota', rotaController.rota);
router.post('/updateRota', rotaController.updateRota);
router.get('/userDuties', rotaController.userDuties);

export default router;