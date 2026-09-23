import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { sendMessageSchema, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MessagingService } from './messaging.service';

const createConversationSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  participantIds: z.array(z.string().uuid()).min(1).max(10),
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  fileUrl: z.string().url().optional().or(z.literal('')),
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

@Controller('conversations')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post()
  create(
    @CurrentUser() user: never,
    @Body(new ZodValidationPipe(createConversationSchema)) body: z.infer<typeof createConversationSchema>,
  ) {
    return { data: this.messaging.createConversation(user as never, body) };
  }

  @Get()
  list(@CurrentUser() user: never, @Query(new ZodValidationPipe(pageQuery)) query: { page: number; limit: number }) {
    return this.messaging.listMine(user as never, query.page, query.limit);
  }

  @Get(':id')
  find(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.messaging.findDetailed(id, user as never) };
  }

  @Get(':id/messages')
  messages(@CurrentUser() user: never, @Param('id') id: string, @Query(new ZodValidationPipe(pageQuery)) query: { page: number; limit: number }) {
    return this.messaging.messages(id, user as never, query.page, query.limit);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: never,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(messageSchema)) body: z.infer<typeof messageSchema>,
  ) {
    return { data: this.messaging.send(user as never, id, body) };
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: never, @Param('id') id: string) {
    return this.messaging.markRead(user as never, id);
  }
}