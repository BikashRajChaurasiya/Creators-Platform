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

export interface NavEntry {
  href: string;
  label: string;
  /** Roles allowed to open this page. Omitted means every ops role. */
  roles?: readonly AllowedRole[];
}

/**
 * Admin console navigation.
 *
 * Each entry carries the roles the backend actually authorises, so the nav
 * never offers a link that immediately redirects the user away. The page
 * guards mirror these lists.
 */
export const ADMIN_NAV: NavEntry[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Users', roles: ['admin', 'manager'] },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/verifications', label: 'Verifications', roles: ['admin'] },
  { href: '/admin/finance', label: 'Finance', roles: ['admin', 'finance'] },
  { href: '/admin/settings', label: 'Settings', roles: ['admin'] },
  { href: '/admin/audit', label: 'Audit log', roles: ['admin'] },
];

/** Roles that get the admin console rather than a creator/brand portal. */
export const ADMIN_CONSOLE_ROLES = ['admin', 'manager', 'qa', 'finance'] as const satisfies readonly AllowedRole[];

/** Where each role lands after signing in. */
export const ROLE_PATH: Record<AllowedRole, string> = {
  creator: '/creator',
  brand: '/brand',
  admin: '/admin',
  manager: '/admin',
  qa: '/admin',
  finance: '/admin',
};

export const ROLE_BY_ALLOWED: Record<AllowedRole, string> = {
  creator: 'CREATOR',
  brand: 'BRAND',
  admin: 'ADMIN',
  manager: 'MANAGER',
  qa: 'QA',
  finance: 'FINANCE',
};

/** Narrows the admin nav to the pages `role` is allowed to open. */
export function adminNavFor(role: AllowedRole): NavEntry[] {
  return ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(role));
}

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