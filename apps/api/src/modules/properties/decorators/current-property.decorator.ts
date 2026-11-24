import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPropertyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.propertyId || request.headers['x-property-id'] || request.user?.propertyId;
  }
);
