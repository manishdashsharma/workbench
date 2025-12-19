import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  type: z.enum(['FEATURE', 'BUG']),
  projectId: z.string().min(1, 'Project ID is required'),
  assignedToId: z.string().optional(),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  description: z.string().optional(),
  type: z.enum(['FEATURE', 'BUG']).optional(),
  assignedToId: z.string().optional(),
  startTime: z.string().datetime('Invalid start time format').optional(),
  endTime: z.string().datetime('Invalid end time format').optional(),
});

export const getTasksSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'REVIEWED']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
