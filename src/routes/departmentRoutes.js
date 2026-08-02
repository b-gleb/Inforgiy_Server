import express from 'express';
import makeDepartmentController from '../controllers/departmentController.js';

export default function makeDepartmentRoutes(database) {
  const router = express.Router();
  const departmentController = makeDepartmentController(database);

  router.get('/departments/:slug', departmentController.getDepartmentBySlug);

  return router;
}
