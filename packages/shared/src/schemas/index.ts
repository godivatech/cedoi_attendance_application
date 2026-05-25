import { z } from 'zod';

export const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  companyName: z.string().min(2, 'Company name is required'),
  mobileNumber: z.string().min(10, 'Valid mobile number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  businessCategory: z.string().min(2, 'Business category is required'),
  city: z.string().min(2, 'City is required'),
  joinDate: z.string(),
  notes: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;
