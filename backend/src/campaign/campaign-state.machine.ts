import { BadRequestException } from '@nestjs/common';
import { CampaignStatus, CAMPAIGN_TRANSITIONS } from '@ugcnp/shared';

/**
 * Campaign lifecycle guards.
 *
 * The transition table itself lives in `@ugcnp/shared` so the admin/brand
 * portals render exactly the states the API will accept; this module only
 * applies it.
 */
export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (from === to) return;
  const allowed = CAMPAIGN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    const options = allowed?.length ? ` Allowed: ${allowed.join(', ')}.` : ' This state is final.';
    throw new BadRequestException(`Cannot move campaign from ${from} to ${to}.${options}`);
  }
}

export function isTerminal(status: CampaignStatus): boolean {
  const next = CAMPAIGN_TRANSITIONS[status];
  return !next || next.length === 0;
}
