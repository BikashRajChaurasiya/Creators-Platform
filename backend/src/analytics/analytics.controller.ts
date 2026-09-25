import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AnalyticsService } from './analytics.service';

const periodQuery = z.object({
  from: z.string().optional().or(z.literal('')),
  to: z.string().optional().or(z.literal('')),
});

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('creator/:id')
  creator(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.analytics.creatorStats(user as never, id) };
  }

  @Get('brand/:id')
  brand(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.analytics.brandStats(user as never, id) };
  }

  @Get('platform')
  platform(@CurrentUser() user: never, @Query(new ZodValidationPipe(periodQuery)) query: { from?: string; to?: string }) {
    return { data: this.analytics.platformStats(user as never, query) };
  }

  @Get('platform/series')
  platformSeries(@CurrentUser() user: never, @Query(new ZodValidationPipe(periodQuery)) query: { from?: string; to?: string }) {
    return { data: this.analytics.platformSeries(user as never, query) };
  }

  @Post('match')
  match(@CurrentUser() user: never, @Body() body: unknown) {
    return { data: this.analytics.match(user as never, body) };
  }

  @Post('copy')
  copy(@Body() body: unknown) {
    return { data: this.analytics.generateCopy(body) };
  }

  @Post('predict')
  predict(@Body() body: unknown) {
    return { data: this.analytics.predict(body) };
  }
}