import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard.js';
import { PermissionsGuard } from '../src/modules/auth/guards/permissions.guard.js';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, PermissionCode } from '@hospitality/shared-types';

describe('RBAC & Permissions Guard', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: unknown): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('RolesGuard', () => {
    it('should allow access if no roles are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const ctx = createMockContext({ role: UserRole.FRONT_DESK });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('should allow access if user has the required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER, UserRole.MANAGER]);
      const ctx = createMockContext({ role: UserRole.OWNER });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks the required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
      const ctx = createMockContext({ role: UserRole.HOUSEKEEPING });
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not authenticated', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.FRONT_DESK]);
      const ctx = createMockContext(null);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('PermissionsGuard', () => {
    it('should allow access if no permissions are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const ctx = createMockContext({ role: UserRole.FRONT_DESK, permissions: [] });
      expect(permissionsGuard.canActivate(ctx)).toBe(true);
    });

    it('should allow OWNER to bypass permission requirements', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PermissionCode.TAX_MANAGE]);
      const ctx = createMockContext({ role: UserRole.OWNER, permissions: [] });
      expect(permissionsGuard.canActivate(ctx)).toBe(true);
    });

    it('should allow access if user holds all required permissions', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        PermissionCode.BOOKING_READ,
        PermissionCode.BOOKING_CREATE,
      ]);
      const ctx = createMockContext({
        role: UserRole.FRONT_DESK,
        permissions: [PermissionCode.BOOKING_READ, PermissionCode.BOOKING_CREATE],
      });
      expect(permissionsGuard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenException if user is missing a required permission', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        PermissionCode.BOOKING_READ,
        PermissionCode.TAX_MANAGE,
      ]);
      const ctx = createMockContext({
        role: UserRole.FRONT_DESK,
        permissions: [PermissionCode.BOOKING_READ],
      });
      expect(() => permissionsGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
