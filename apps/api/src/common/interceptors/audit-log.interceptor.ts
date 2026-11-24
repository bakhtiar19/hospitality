import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { prisma } from '@hospitality/database';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const propertyId = request.propertyId || user?.propertyId;
    const path = request.originalUrl || request.url;
    const ipAddress = request.ip || (request.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = (request.headers['user-agent'] as string) || 'unknown';

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (!propertyId) return;

        try {
          await prisma.auditLog.create({
            data: {
              propertyId,
              userId: user?.sub || null,
              action: `${method} ${path}`,
              entityType: 'HTTP_REQUEST',
              entityId: path,
              oldValues: request.body ? (request.body as object) : undefined,
              newValues: responseBody ? (responseBody as object) : undefined,
              ipAddress,
              userAgent,
            },
          });
        } catch (err) {
          console.error('[AuditLog] Failed to record audit log:', err);
        }
      })
    );
  }
}
