import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PERMISSIONS, UserRole } from '@ugcnp/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const allowed = ROLE_PERMISSIONS[user.role as UserRole] ?? [];
      const missing = requiredPermissions.find((p) => !allowed.includes(p as never));
      if (missing) {
        throw new ForbiddenException(`Missing permission: ${missing}`);
      }
    }
    return true;
  }
}