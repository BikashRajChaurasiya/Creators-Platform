import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { creatorProfileSchema, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreatorService } from './creator.service';

const portfolioSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().url(),
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER']),
  caption: z.string().trim().max(500).optional().or(z.literal('')),
  thumbnail: z.string().url().optional().or(z.literal('')),
});

const discoverQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  language: z.string().optional().or(z.literal('')),
  minFollowers: z.coerce.number().int().min(0).optional(),
  available: z.coerce.boolean().optional(),
  search: z.string().optional().or(z.literal('')),
});

@Controller('creator')
export class CreatorController {
  constructor(private readonly creator: CreatorService) {}

  @Get('me/profile')
  meProfile(@CurrentUser('id') userId: string) {
    return { data: this.creator.getMyProfile(userId) };
  }

  @Put('me/profile')
  upsertProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(creatorProfileSchema)) body: z.infer<typeof creatorProfileSchema>,
  ) {
    return { data: this.creator.upsertProfile(userId, body) };
  }

  @Get('me/portfolio')
  myPortfolio(@CurrentUser('id') userId: string) {
    return this.creator.getMyProfile(userId);
  }

  @Post('me/portfolio')
  addPortfolio(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(portfolioSchema)) body: z.infer<typeof portfolioSchema>,
  ) {
    return { data: this.creator.addPortfolio(userId, body) };
  }

  @Delete('me/portfolio/:id')
  removePortfolio(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.creator.removePortfolio(userId, id);
  }

  @Post('me/verification')
  verify(@CurrentUser('id') userId: string, @Body() body: { documentUrl?: string }) {
    if (!body.documentUrl) throw new Error('documentUrl required');
    return { data: this.creator.submitVerification(userId, body.documentUrl) };
  }

  // Public-ish discover surface for brands / admins
  @Get('discover')
  discover(@Query(new ZodValidationPipe(discoverQuery)) query: z.infer<typeof discoverQuery>) {
    return this.creator.discover(query);
  }

  // Public creator profile view (by profile id)
  @Get('public/:id')
  publicProfile(@Param('id') id: string) {
    return { data: this.creator.getProfilePublic(id) };
  }
}