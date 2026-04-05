import { z } from 'zod';

export const CreateDrugBody = z.object({
  name: z.string().min(1),
  genericName: z.string().min(1).optional(),
  drugClass: z.string().min(1).optional(),
  maxDailyDose: z.number().nonnegative().optional(),
  maxSingleDose: z.number().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const LogDoseBody = z.object({
  drugId: z.number().int().positive().optional(),
  date: z.string().min(1),
  endDate: z.string().min(1).optional(),
  route: z.string().min(1),
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const UpdateDoseBody = LogDoseBody.partial().refine(value => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

export const CreateProfileBody = z.object({
  accountId: z.number().int().positive().optional(),
  name: z.string().min(1),
  payload: z.record(z.any()),
});

export const UpdateProfileBody = CreateProfileBody.partial().refine(
  value => Object.keys(value).length > 0,
  {
    message: 'At least one field is required',
  }
);

export const CreateAccountBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateAccountBody = CreateAccountBody.partial().refine(
  value => Object.keys(value).length > 0,
  {
    message: 'At least one field is required',
  }
);

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
