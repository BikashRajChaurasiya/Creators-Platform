/**
 * Core domain enums shared across frontend, backend, and AI service.
 */

export const USER_ROLES = [
  'CREATOR',
  'BRAND',
  'ADMIN',
  'MANAGER',
  'QA',
  'FINANCE',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  CREATOR: 'Creator',
  BRAND: 'Brand',
  ADMIN: 'Administrator',
  MANAGER: 'Operations Manager',
  QA: 'Quality Assurance',
  FINANCE: 'Finance',
};

export const USER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'RECRUITING',
  'SHORTLISTING',
  'PRODUCTION',
  'REVIEW',
  'PUBLISHED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_FLOW = [
  'DRAFT',
  'RECRUITING',
  'SHORTLISTING',
  'PRODUCTION',
  'REVIEW',
  'PUBLISHED',
  'COMPLETED',
] as const;

export const CAMPAIGN_OBJECTIVES = [
  'BRAND_AWARENESS',
  'PRODUCT_LAUNCH',
  'SALES_CONVERSION',
  'ENGAGEMENT',
  'USER_GENERATED_CONTENT',
  'TRAFFIC',
] as const;
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

export const PLATFORM_TYPES = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X', 'LINKEDIN'] as const;
export type PlatformType = (typeof PLATFORM_TYPES)[number];

export const APPLICATION_STATUSES = ['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const SUBMISSION_STATUSES = ['DRAFT', 'SUBMITTED', 'IN_REVISION', 'APPROVED', 'REJECTED'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TYPES = ['CAMPAIGN_PAYOUT', 'COMMISSION', 'ADJUSTMENT', 'REFUND'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const MESSAGE_TYPES = ['TEXT', 'FILE', 'SYSTEM'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const NOTIFICATION_TYPES = ['EMAIL', 'PUSH', 'IN_APP'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_EVENTS = [
  'CAMPAIGN_INVITE',
  'APPLICATION_RECEIVED',
  'APPLICATION_ACCEPTED',
  'APPLICATION_REJECTED',
  'REVISION_REQUEST',
  'SUBMISSION_APPROVED',
  'PAYMENT_COMPLETED',
  'NEW_MESSAGE',
  'CAMPAIGN_STATUS_CHANGE',
  'SYSTEM',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const CREATOR_CATEGORIES = [
  'LIFESTYLE',
  'BEAUTY',
  'FASHION',
  'FOOD',
  'TRAVEL',
  'FITNESS',
  'TECH',
  'GAMING',
  'EDUCATION',
  'BUSINESS',
  'MUSIC',
  'ENTERTAINMENT',
  'SPORTS',
  'PARENTING',
] as const;
export type CreatorCategory = (typeof CREATOR_CATEGORIES)[number];

export const DELIVERABLE_TYPES = ['REEL', 'SHORT', 'PHOTO_CAROUSEL', 'SINGLE_PHOTO', 'STORY', 'YOUTUBE_VIDEO', 'TIKTOK', 'FACEBOOK_POST'] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const USAGE_RIGHTS = ['EXCLUSIVE_FOREVER', 'NON_EXCLUSIVE', 'TIMED_LICENSE'] as const;
export type UsageRights = (typeof USAGE_RIGHTS)[number];

/** Internal ops roles that are not external users. */
export const INTERNAL_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'QA', 'FINANCE'];

/** Permission keys used by the RBAC system. */
export const PERMISSIONS = [
  'users.read', 'users.write',
  'creators.read', 'creators.write', 'creators.verify',
  'brands.read', 'brands.write', 'brands.verify',
  'campaigns.read', 'campaigns.write', 'campaigns.review', 'campaigns.publish',
  'applications.read', 'applications.review',
  'submissions.review', 'submissions.approve',
  'payments.read', 'payments.write', 'payments.approve',
  'messages.read', 'messages.write',
  'settings.read', 'settings.write',
  'reports.read',
  'tasks.read', 'tasks.write',
  'audit.read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Default permission matrix per role. */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CREATOR: [
    'creators.write',
    'campaigns.read',
    'applications.read',
    'messages.read', 'messages.write',
    'payments.read',
  ],
  BRAND: [
    'brands.write',
    'creators.read',
    'campaigns.read', 'campaigns.write', 'campaigns.review', 'campaigns.publish',
    'applications.read', 'applications.review',
    'submissions.review', 'submissions.approve',
    'messages.read', 'messages.write',
    'payments.read',
  ],
  MANAGER: [
    'users.read',
    'creators.read', 'creators.write',
    'brands.read', 'brands.write',
    'campaigns.read', 'campaigns.write', 'campaigns.review', 'campaigns.publish',
    'applications.read', 'applications.review',
    'submissions.review', 'submissions.approve',
    'payments.read',
    'messages.read',
    'reports.read',
    'tasks.read', 'tasks.write',
  ],
  QA: [
    'campaigns.read',
    'applications.read',
    'submissions.review', 'submissions.approve',
    'messages.read',
    'reports.read',
    'tasks.read', 'tasks.write',
  ],
  FINANCE: [
    'payments.read', 'payments.write', 'payments.approve',
    'campaigns.read',
    'reports.read',
    'messages.read',
    'tasks.read',
  ],
  ADMIN: [...PERMISSIONS],
};