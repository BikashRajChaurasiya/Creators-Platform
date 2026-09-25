import { Body, Controller, Get, Post } from '@nestjs/common';
import { disputeRaiseSchema, z } from '@ugcnp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DisputesService } from './disputes.service';

@Controller('disputes')
@Roles('CREATOR', 'BRAND')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  raise(@CurrentUser() user: never, @Body(new ZodValidationPipe(disputeRaiseSchema)) body: z.infer<typeof disputeRaiseSchema>) {
    return { data: this.disputes.raise(user as never, body) };
  }

  @Get('mine')
  mine(@CurrentUser() user: never) {
    return { data: this.disputes.mine(user as never) };
  }
}