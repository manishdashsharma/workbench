import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  reviewTask,
  runCarryForward,
  getCarriedForward,
} from '../controllers/task.controller.js';
import { validateRequest, authenticate } from '../../../shared/index.js';
import {
  createTaskSchema,
  updateTaskSchema,
  getTasksSchema,
} from '../validations/task.schema.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validateRequest(createTaskSchema), createTask);
router.get('/', validateRequest(getTasksSchema, 'query'), getTasks);
router.get('/carried-forward', getCarriedForward);
router.post('/carry-forward', runCarryForward);
router.get('/:id', getTask);
router.put('/:id', validateRequest(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/start', startTask);
router.post('/:id/complete', completeTask);
router.post('/:id/review', reviewTask);

export default router;
