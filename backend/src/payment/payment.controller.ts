import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { paymentCreateSchema, paymentReleaseSchema, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentService } from './payment.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  scope: z.enum(['outgoing', 'received', 'all']).default('outgoing'),
});

const statusSchema = z.object({ status: z.string().min(1).max(30) }).strict();

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post()
  create(@CurrentUser() user: never, @Body(new ZodValidationPipe(paymentCreateSchema)) body: z.infer<typeof paymentCreateSchema>) {
    return { data: this.payments.create(user as never, body) };
  }

  @Get()
  list(@CurrentUser() user: never, @Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.payments.list(user as never, query.scope, query.page, query.limit);
  }

  @Get('summary')
  summary(@CurrentUser() user: never) {
    return { data: this.payments.summary(user as never) };
  }

  @Get('invoices')
  invoices(@CurrentUser() user: never, @Query(new ZodValidationPipe(listQuery)) query: { page: number; limit: number }) {
    return this.payments.listInvoices(user as never, query.page, query.limit);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: never, @Param('id') id: string) {
    return { data: this.payments.approve(user as never, id) };
  }

  @Post(':id/release')
  release(@CurrentUser() user: never, @Param('id') id: string, @Body(new ZodValidationPipe(paymentReleaseSchema)) body: z.infer<typeof paymentReleaseSchema>) {
    return { data: this.payments.release(user as never, id, body) };
  }

  @Patch(':id/status')
  updateStatus(@CurrentUser() user: never, @Param('id') id: string, @Body(new ZodValidationPipe(statusSchema)) body: { status: string }) {
    return { data: this.payments.updateStatus(user as never, id, body.status) };
  }
}