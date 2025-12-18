import express from 'express';
import { health, register, login, logout, getMe, getMyActivities, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validateRequest, authenticate } from '../../../shared/index.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, getActivitiesSchema } from '../validations/auth.schema.js';

const router = express.Router();

router.get('/health', health);
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

router.use(authenticate);

router.get('/me', getMe);
router.get('/me/activities', validateRequest(getActivitiesSchema, 'query'), getMyActivities);
router.post('/logout', logout);

export default router;
