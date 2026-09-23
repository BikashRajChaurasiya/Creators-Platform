import { AllowedRole } from '@/components/require-auth';

export const CREATOR_NAV: { href: string; label: string }[] = [
  { href: '/creator', label: 'Dashboard' },
  { href: '/creator/discover', label: 'Discover campaigns' },
  { href: '/creator/applications', label: 'My applications' },
  { href: '/creator/messages', label: 'Messages' },
];

export const BRAND_NAV: { href: string; label: string }[] = [
  { href: '/brand', label: 'Dashboard' },
  { href: '/brand/campaigns', label: 'Campaigns' },
  { href: '/brand/applications', label: 'Applications' },
  { href: '/brand/messages', label: 'Messages' },
];

export const ADMIN_NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/campaigns', label: 'Campaigns' },
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
    RECRUITING: 'blue',
    PENDING: 'amber',
    SHORTLISTED: 'blue',
    DRAFT: 'gray',
    SUSPENDED: 'red',
    BANNED: 'red',
    REJECTED: 'red',
    REVIEWING: 'amber',
    SELECTED: 'green',
    COMPLETED: 'green',
    CLOSED: 'gray',
    CANCELLED: 'red',
  };
  return map[status] ?? 'gray';
}

export const CURRENCY = (n: number) => `NPR ${n.toLocaleString('en-IN')}`;