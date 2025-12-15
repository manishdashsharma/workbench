import express from 'express';
import { healthRoutes } from '../modules/health/index.js';

const router = express.Router();

// Register module routes
router.use('/health', healthRoutes);

export default router;
