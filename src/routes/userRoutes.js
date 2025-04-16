import express from'express';
const router = express.Router();
import userController from'../controllers/userController.js';

router.get('/users', userController.users);
router.post('/updateUser', userController.updateUser);
router.post('/removeUser', userController.removeUser);

export default router;