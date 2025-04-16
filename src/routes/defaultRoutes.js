import express from 'express';
const router = express.Router();
import defaultController from '../controllers/defaultController.js';

router.get('/ping', defaultController.ping);
router.get('/auth', defaultController.auth);

export default router;