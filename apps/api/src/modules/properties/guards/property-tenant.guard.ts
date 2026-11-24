import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PropertyTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const headerPropertyId = request.headers['x-property-id'] as string;

    const propertyId = headerPropertyId || user?.propertyId;

    if (!propertyId) {
      throw new ForbiddenException('Tenant context missing: propertyId must be provided');
    }

    // If user is logged in, ensure they belong to this property (unless global Owner)
    if (user && user.propertyId && headerPropertyId && user.propertyId !== headerPropertyId && user.role !== 'OWNER') {
      throw new ForbiddenException('Cross-tenant violation: User does not belong to specified property');
    }

    request.propertyId = propertyId;
    return true;
  }
}
