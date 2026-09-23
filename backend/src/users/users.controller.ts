import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional().nullable().or(z.literal('')),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return { data: this.users.me(userId) };
  }

  @Patch('me')
  updateMe(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateMeSchema)) body: unknown,
  ) {
    return { data: this.users.updateMe(userId, body as never) };
  }
}