import { z } from 'zod';
import {
  USER_ROLES,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_STATUSES,
  PLATFORM_TYPES,
  APPLICATION_STATUSES,
  SUBMISSION_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  INVOICE_STATUSES,
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_EVENTS,
  CREATOR_CATEGORIES,
  DELIVERABLE_TYPES,
  USAGE_RIGHTS,
  USER_STATUSES,
} from './domain';

const email = z.string().trim().toLowerCase().email('Invalid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Must contain letters')
  .regex(/[0-9]/, 'Must contain a number');
const phone = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

// ------------------------------------------------------------------ auth
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(100),
    email,
    password,
    phone,
    role: z.enum(USER_ROLES),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const requestOtpSchema = z
  .object({
    email,
    purpose: z.enum(['LOGIN', 'REGISTER', 'PASSWORD_RESET']),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email,
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/),
    purpose: z.enum(['LOGIN', 'REGISTER', 'PASSWORD_RESET']),
  })
  .strict();

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(10) }).strict();

// ------------------------------------------------------------------ creators
export const creatorProfileSchema = z
  .object({
    bio: z.string().trim().max(1000).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    district: z.string().trim().max(100).optional().or(z.literal('')),
    language: z.array(z.string().max(40)).max(10).optional(),
    category: z.enum(CREATOR_CATEGORIES).optional(),
    instagram: z.string().trim().max(255).optional().or(z.literal('')),
    tiktok: z.string().trim().max(255).optional().or(z.literal('')),
    youtube: z.string().trim().max(255).optional().or(z.literal('')),
    facebook: z.string().trim().max(255).optional().or(z.literal('')),
    skills: z.array(z.string().max(40)).max(30).optional(),
    rateMin: z.number().int().nonnegative().optional(),
    rateMax: z.number().int().nonnegative().optional(),
    availableForWork: z.boolean().optional(),
  })
  .strict();

// ------------------------------------------------------------------ brands
export const brandProfileSchema = z
  .object({
    companyName: z.string().trim().min(2, 'Company name is required').max(150),
    industry: z.string().trim().max(100),
    website: z.string().trim().url('Invalid URL').optional().or(z.literal('')),
    contactPerson: z.string().trim().max(100),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    address: z.string().trim().max(200).optional().or(z.literal('')),
  })
  .strict();

// ------------------------------------------------------------------ campaigns
export const campaignSchema = z
  .object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150),
    description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000),
    objective: z.enum(CAMPAIGN_OBJECTIVES),
    product: z.string().trim().max(200),
    targetAudience: z.object({
      ageRange: z.tuple([z.number(), z.number()]).optional(),
      gender: z.enum(['ALL', 'MALE', 'FEMALE', 'OTHER']).optional(),
      interests: z.array(z.string().max(50)).max(20).optional(),
      locations: z.array(z.string().max(100)).max(20).optional(),
    }).optional(),
    targetLocations: z.array(z.string().max(100)).max(20),
    platforms: z.array(z.enum(PLATFORM_TYPES)).min(1),
    creatorRequirements: z.object({
      categories: z.array(z.enum(CREATOR_CATEGORIES)).min(1),
      minFollowers: z.number().int().min(0).optional(),
      languages: z.array(z.string().max(40)).max(10).optional(),
      locations: z.array(z.string().max(100)).max(20).optional(),
      verificationRequired: z.boolean().optional(),
      mustHaveTags: z.array(z.string().max(100)).max(20).optional(),
    }),
    deliverables: z.array(
      z.object({
        type: z.enum(DELIVERABLE_TYPES),
        quantity: z.number().int().min(1).max(500),
        spec: z.string().max(500).optional().or(z.literal('')),
      }),
    ).min(1),
    deadline: z.string().datetime().or(z.coerce.date()),
    budget: z.object({
      amountMin: z.number().int().positive(),
      amountMax: z.number().int().positive(),
      currency: z.string().length(3).default('NPR'),
      perCreator: z.boolean().default(true),
    }),
    usageRights: z.enum(USAGE_RIGHTS),
    status: z.enum(CAMPAIGN_STATUSES).optional(),
  })
  .strict();

export const campaignPublishSchema = z.object({ status: z.enum(['DRAFT', 'RECRUITING']) }).strict();

export const campaignStateSchema = z.object({ status: z.enum(CAMPAIGN_STATUSES) }).strict();

export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  category: z.enum(CREATOR_CATEGORIES).optional(),
  location: z.string().optional(),
  platform: z.enum(PLATFORM_TYPES).optional(),
  search: z.string().optional(),
});

// ------------------------------------------------------------------ applications
export const applyCampaignSchema = z
  .object({
    pitch: z.string().trim().min(20, 'Pitch must be at least 20 characters').max(2000),
    proposedRate: z.number().int().positive().optional(),
    portfolioId: z.string().uuid().optional(),
  })
  .strict();

export const reviewApplicationSchema = z
  .object({
    decision: z.enum(['SHORTLISTED', 'ACCEPTED', 'REJECTED']),
    note: z.string().max(1000).optional().or(z.literal('')),
  })
  .strict();

export const submissionSchema = z
  .object({
    fileUrl: z.string().min(1).max(2000),
    caption: z.string().max(2000).optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })
  .strict();

export const feedbackSchema = z
  .object({
    feedback: z.string().trim().min(1, 'Feedback is required').max(3000),
    status: z.enum(['IN_REVISION', 'APPROVED', 'REJECTED']).optional(),
  })
  .strict();

// ------------------------------------------------------------------ messaging
export const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    recipientId: z.string().uuid().optional(),
    content: z.string().trim().min(1).max(4000),
    fileUrl: z.string().url().optional().or(z.literal('')),
  })
  .strict();

// ------------------------------------------------------------------ payments
export const paymentCreateSchema = z
  .object({
    creatorId: z.string().uuid(),
    campaignId: z.string().uuid(),
    amount: z.number().int().positive(),
    type: z.enum(PAYMENT_TYPES).default('CAMPAIGN_PAYOUT'),
    description: z.string().max(500).optional().or(z.literal('')),
  })
  .strict();

export const paymentApproveSchema = z.object({ status: z.enum(['APPROVED', 'PAID', 'FAILED', 'CANCELLED']) }).strict();

// ------------------------------------------------------------------ admin
export const platformSettingsSchema = z
  .object({
    commissionPercent: z.number().int().min(0).max(60).optional(),
    theme: z
      .object({
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        logoUrl: z.string().url().optional().or(z.literal('')),
        brandName: z.string().max(100).optional(),
      })
      .optional(),
    maintenanceMode: z.boolean().optional(),
    signupsOpen: z.boolean().optional(),
    emailFrom: z.string().email().optional(),
  })
  .partial();

export const userStatusSchema = z.object({ status: z.enum(USER_STATUSES) }).strict();
export const userRoleSchema = z.object({ role: z.enum(USER_ROLES) }).strict();

// ------------------------------------------------------------------ pagination
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional().or(z.literal('')),
});