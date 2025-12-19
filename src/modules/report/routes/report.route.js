import express from 'express';
import {
  getCompanyReport,
  getProjectReport,
  getEmployeeReport,
  getMyReport,
} from '../controllers/report.controller.js';
import { authenticate } from '../../../shared/index.js';

const router = express.Router();

router.use(authenticate);

router.get('/company', getCompanyReport);
router.get('/project/:projectId', getProjectReport);
router.get('/employee/:employeeId', getEmployeeReport);
router.get('/me', getMyReport);

export default router;
