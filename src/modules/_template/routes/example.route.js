import express from 'express';
import { health, exampleFunction } from '../controllers/example.controller.js';
import { validateRequest, authenticate, requireVerification } from '../../../shared/index.js';
import { exampleSchema } from '../validations/example.schema.js';

const router = express.Router();

router.get('/health', health);

router.use(authenticate);
router.use(requireVerification);

router.post('/example', validateRequest(exampleSchema, 'body'), exampleFunction);

export default router;
