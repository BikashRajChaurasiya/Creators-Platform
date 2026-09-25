import { AllowedRole } from '@/components/require-auth';

export const CREATOR_NAV: { href: string; label: string }[] = [
  { href: '/creator', label: 'Dashboard' },
  { href: '/creator/discover', label: 'Discover campaigns' },
  { href: '/creator/applications', label: 'My applications' },
  { href: '/creator/payments', label: 'Payouts' },
  { href: '/creator/messages', label: 'Messages' },
  { href: '/creator/profile', label: 'Profile' },
];

export const BRAND_NAV: { href: string; label: string }[] = [
  { href: '/brand', label: 'Dashboard' },
  { href: '/brand/campaigns', label: 'Campaigns' },
  { href: '/brand/applications', label: 'Applications' },
  { href: '/brand/payments', label: 'Payments & invoices' },
  { href: '/brand/messages', label: 'Messages' },
  { href: '/brand/profile', label: 'Profile' },
];

export const ADMIN_NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit', label: 'Audit log' },
];

export const ROLE_BY_ALLOWED: Record<AllowedRole, string> = {
  creator: 'CREATOR',
  brand: 'BRAND',
  admin: 'ADMIN',
};

export const ROLE_LABEL: Record<string, string> = {
  CREATOR: 'Creator',
  BRAND: 'Brand',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  QA: 'QA',
  FINANCE: 'Finance',
};

export function statusColor(status: string): 'gray' | 'green' | 'amber' | 'red' | 'blue' {
  const map: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
    ACTIVE: 'green',
    VERIFIED: 'green',
    ACCEPTED: 'green',
    APPROVED: 'green',
    PAID: 'green',
    CONFIRMED: 'green',
    COMPLETED: 'green',
    RESOLVED: 'green',
    SELECTED: 'green',
    RECRUITING: 'blue',
    SHORTLISTED: 'blue',
    PENDING: 'amber',
    UNDER_REVIEW: 'amber',
    REVIEWING: 'amber',
    DRAFT: 'gray',
    SUSPENDED: 'red',
    BANNED: 'red',
    REJECTED: 'red',
    FAILED: 'red',
    CANCELLED: 'red',
    CLOSED: 'gray',
    OPEN: 'amber',
  };
  return map[status] ?? 'gray';
}

export function taskPriorityColor(priority: string): 'gray' | 'green' | 'amber' | 'red' | 'blue' {
  const map: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
    LOW: 'gray',
    MEDIUM: 'blue',
    HIGH: 'amber',
    URGENT: 'red',
  };
  return map[priority] ?? 'gray';
}

export const CURRENCY = (n: number) => `NPR ${n.toLocaleString('en-IN')}`;