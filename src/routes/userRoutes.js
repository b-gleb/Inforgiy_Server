import express from'express';
import makeUserController from'../controllers/userController.js';

export default function makeUserRoutes(database) {
  const router = express.Router();
  const userController = makeUserController(database);

  router.get('/users', userController.users);
  router.post('/updateUser', userController.updateUser);
  router.post('/removeUser', userController.removeUser);

  return router;
};
