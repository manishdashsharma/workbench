import express from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from '../controllers/project.controller.js';
import { validateRequest, authenticate } from '../../../shared/index.js';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectsSchema,
  addMemberSchema,
} from '../validations/project.schema.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validateRequest(createProjectSchema), createProject);
router.get('/', validateRequest(getProjectsSchema, 'query'), getProjects);
router.get('/:id', getProject);
router.put('/:id', validateRequest(updateProjectSchema), updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', validateRequest(addMemberSchema), addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
