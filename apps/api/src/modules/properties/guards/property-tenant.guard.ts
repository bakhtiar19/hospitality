import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PropertyTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const headerPropertyId = request.headers['x-property-id'] as string | undefined;

    const propertyId = user?.propertyId || headerPropertyId;

    if (!propertyId) {
      throw new ForbiddenException('Tenant context missing: propertyId must be provided');
    }

    // Strict Multi-Tenant isolation: every hotel user (including hotel OWNER) is strictly scoped
    // to their own propertyId. Cross-tenant access via x-property-id is rejected.
    if (
      user &&
      user.propertyId &&
      headerPropertyId &&
      user.propertyId !== headerPropertyId &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('Cross-tenant violation: User does not belong to specified property');
    }

    request.propertyId = user?.role === 'SUPER_ADMIN' && headerPropertyId ? headerPropertyId : propertyId;
    return true;
  }
}
