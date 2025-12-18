import express from 'express';
import { healthRoutes } from '../modules/health/index.js';
import authRoutes from '../modules/auth/index.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;
