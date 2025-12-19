import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  companyImage: z.string().url('Invalid image URL').optional(),
  companyCode: z.string().optional(),
}).refine(
  (data) => data.companyName || data.companyCode,
  {
    message: 'Either companyName or companyCode is required',
    path: ['companyName'],
  }
).refine(
  (data) => !(data.companyName && data.companyCode),
  {
    message: 'Cannot provide both companyName and companyCode',
    path: ['companyName'],
  }
);

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tempPassword: z.string().min(1, 'Temporary password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export const getActivitiesSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: z.enum(['LOGIN', 'LOGOUT']).optional()
});

export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  image: z.string().url('Invalid image URL').optional(),
});

export const getCompanyMembersSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
