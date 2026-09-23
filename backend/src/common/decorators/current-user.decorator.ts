import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@ugcnp/shared';

export interface JwtUser extends AuthUser {
  userId: string;
  refreshTokenVersion: number;
}

export const CurrentUser = createParamDecorator(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data: string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    if (data) return (user as unknown as Record<string, unknown>)?.[data];
    return user;
  },
);