import { z } from 'zod';

export const exampleSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),

  email: z.string()
    .email('Invalid email address')
    .optional(),

  age: z.number()
    .int('Age must be an integer')
    .min(0, 'Age must be positive')
    .optional(),
});
