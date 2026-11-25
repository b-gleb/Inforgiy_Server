import express from 'express';
import makeUserController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

export default function makeUserRoutes(database) {
  const router = express.Router();
  const userController = makeUserController(database);

  router.post('/users', authenticate, userController.users);
  router.post('/updateUser', authenticate, userController.updateUser);
  router.post('/removeUser', authenticate, userController.removeUser);

  return router;
}
