import express from 'express';
import { healthRoutes } from '../modules/health/index.js';
import authRoutes from '../modules/auth/index.js';
import { projectRoutes } from '../modules/project/index.js';
import { taskRoutes } from '../modules/task/index.js';
import { reportRoutes } from '../modules/report/index.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/reports', reportRoutes);

export default router;
