import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { applyCampaignSchema, reviewApplicationSchema, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApplicationService } from './application.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  scope: z.enum(['mine', 'received', 'all']).default('mine'),
});

const submissionSchema = z.object({
  fileUrl: z.string().min(5).max(2000),
  caption: z.string().max(2000).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

const feedbackSchema = z.object({
  feedback: z.string().trim().min(1).max(3000),
  status: z.enum(['IN_REVISION', 'APPROVED', 'REJECTED']).optional(),
});

@Controller()
export class ApplicationController {
  constructor(private readonly applications: ApplicationService) {}

  @Post('campaigns/:id/apply')
  apply(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(applyCampaignSchema)) body: z.infer<typeof applyCampaignSchema>,
  ) {
    return { data: this.applications.apply(user as never, id, body) };
  }

  @Post('applications/:id/withdraw')
  withdraw(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.applications.withdraw(user as never, id) };
  }

  @Get('applications')
  list(@CurrentUser() user: never, @Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.applications.listMine(user as never, query.scope, query.page, query.limit);
  }

  @Get('applications/:id')
  findOne(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.applications.findOne(user as never, id) };
  }

  @Post('applications/:id/review')
  review(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewApplicationSchema)) body: z.infer<typeof reviewApplicationSchema>,
  ) {
    return { data: this.applications.review(user as never, id, body) };
  }

  @Post('applications/:id/submissions')
  submit(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submissionSchema)) body: z.infer<typeof submissionSchema>,
  ) {
    return { data: this.applications.addSubmission(user as never, id, body) };
  }

  @Post('submissions/:id/feedback')
  feedback(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(feedbackSchema)) body: z.infer<typeof feedbackSchema>,
  ) {
    return { data: this.applications.feedback(user as never, id, body) };
  }

  @Post('submissions/:id/analyze')
  analyze(@CurrentUser() user: never, @Param('id') id: string) {
    return this.applications.aiAnalyze(user as never, id);
  }
}