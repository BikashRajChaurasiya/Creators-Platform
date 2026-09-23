import { BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@ugcnp/shared';

/**
 * Allowed campaign lifecycle transitions.
 */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['RECRUITING', 'CANCELLED'],
  RECRUITING: ['SHORTLISTING', 'COMPLETED', 'CANCELLED'],
  SHORTLISTING: ['PRODUCTION', 'RECRUITING', 'CANCELLED'],
  PRODUCTION: ['REVIEW', 'CANCELLED'],
  REVIEW: ['PUBLISHED', 'PRODUCTION', 'CANCELLED'],
  PUBLISHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (from === to) return;
  const allowed = CAMPAIGN_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`Cannot move campaign from ${from} to ${to}`);
  }
}

export function isTerminal(status: CampaignStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}