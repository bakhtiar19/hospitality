import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) {
      throw new ForbiddenException('User context missing or no permissions granted');
    }

    // Super Admin & Hotel Owner bypass explicit permission check
    if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER') {
      return true;
    }

    const hasAll = requiredPermissions.every((perm) => user.permissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException('Missing one or more required permissions');
    }

    return true;
  }
}
