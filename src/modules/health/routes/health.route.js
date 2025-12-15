import express from 'express';
import {
  healthCheck,
  detailedHealthCheck,
  readyCheck,
  liveCheck,
  databaseHealthCheck,
  fullSystemStatus,
} from '../controllers/health.controller.js';

const router = express.Router();

router.get('/', healthCheck);
router.get('/detailed', detailedHealthCheck);
router.get('/ready', readyCheck);
router.get('/live', liveCheck);
router.get('/database', databaseHealthCheck);
router.get('/system', fullSystemStatus);

export default router;
