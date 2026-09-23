import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CAMPAIGN_STATUSES, campaignSchema, CampaignStatus, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CampaignService } from './campaign.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

const discoverQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  platform: z.string().optional().or(z.literal('')),
  search: z.string().optional().or(z.literal('')),
});

const stateSchema = z.object({ status: z.enum(CAMPAIGN_STATUSES) }).strict();
const inviteSchema = z.object({ creatorProfileId: z.string().uuid(), message: z.string().max(500).optional().or(z.literal('')) }).strict();

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaigns: CampaignService) {}

  @Post()
  create(@CurrentUser() user: never, @Body(new ZodValidationPipe(campaignSchema)) body: z.infer<typeof campaignSchema>) {
    return { data: this.campaigns.create(user as never, body) };
  }

  @Get('mine')
  mine(@CurrentUser() user: never, @Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.campaigns.listMine(user as never, query);
  }

  @Get('discover')
  discover(@Query(new ZodValidationPipe(discoverQuery)) query: z.infer<typeof discoverQuery>) {
    return this.campaigns.discover(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: never) {
    return { data: this.campaigns.findOne(id, user as never) };
  }

  @Patch(':id')
  update(@CurrentUser() user: never, @Param('id') id: string, @Body() body: Record<string, never>) {
    return { data: this.campaigns.update(user as never, id, body) };
  }

  @Post(':id/state')
  transition(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(stateSchema)) body: { status: CampaignStatus },
  ) {
    return { data: this.campaigns.transition(user as never, id, body.status) };
  }

  @Post(':id/invite')
  invite(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteSchema)) body: z.infer<typeof inviteSchema>,
  ) {
    return { data: this.campaigns.invite(user as never, id, body.creatorProfileId, body.message) };
  }
}