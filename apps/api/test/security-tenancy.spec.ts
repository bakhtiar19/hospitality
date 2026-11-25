import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PropertyTenantGuard } from '../src/modules/properties/guards/property-tenant.guard.js';

describe('Multi-Tenant SaaS Security Guard', () => {
  const guard = new PropertyTenantGuard();

  const createCtx = (user: any, headers: Record<string, string> = {}) => {
    const req: any = { user, headers };
    return {
      req,
      ctx: {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as unknown as ExecutionContext,
    };
  };

  it('scopes tenant OWNER strictly to their own propertyId', () => {
    const { req, ctx } = createCtx({ sub: 'u1', role: 'OWNER', propertyId: 'prop-hotel-a' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.propertyId).toBe('prop-hotel-a');
  });

  it('blocks OWNER of Hotel A from accessing Hotel B via x-property-id header (anti-IDOR)', () => {
    const { ctx } = createCtx(
      { sub: 'u1', role: 'OWNER', propertyId: 'prop-hotel-a' },
      { 'x-property-id': 'prop-hotel-b' }
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('blocks FRONT_DESK of Hotel A from accessing Hotel B via x-property-id header', () => {
    const { ctx } = createCtx(
      { sub: 'u2', role: 'FRONT_DESK', propertyId: 'prop-hotel-a' },
      { 'x-property-id': 'prop-hotel-b' }
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects requests missing propertyId context entirely', () => {
    const { ctx } = createCtx({ sub: 'u3', role: 'FRONT_DESK' }, {});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows platform SUPER_ADMIN to switch to any connected hotel via x-property-id', () => {
    const { req, ctx } = createCtx(
      { sub: 'admin-1', role: 'SUPER_ADMIN', propertyId: 'prop-hotel-a' },
      { 'x-property-id': 'prop-hotel-b' }
    );
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.propertyId).toBe('prop-hotel-b');
  });
});
