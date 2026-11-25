import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { prisma } from '@hospitality/database';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'currentpassword',
  'refreshtoken',
  'accesstoken',
  'token',
  'secret',
  'credentials',
  'credentialsencrypted',
  'logourl',
]);

function redactSensitive(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[TRUNCATED]';
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 120)}...[TRUNCATED ${value.length} chars]` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactSensitive(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitive(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

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
              oldValues: request.body ? (redactSensitive(request.body) as object) : undefined,
              newValues: responseBody ? (redactSensitive(responseBody) as object) : undefined,
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
