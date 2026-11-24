import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { prisma } from '@hospitality/database';
import crypto from 'crypto';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    if (!idempotencyKey || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const path = request.originalUrl || request.url;
    const bodyStr = JSON.stringify(request.body || {});
    const requestChecksum = crypto.createHash('sha256').update(bodyStr).digest('hex');

    // Check existing key in database
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      if (existing.requestChecksum !== requestChecksum) {
        throw new ConflictException(
          'Idempotency key reused with different request payload.'
        );
      }
      // Return cached response
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours retention
          await prisma.idempotencyKey.create({
            data: {
              key: idempotencyKey,
              path,
              requestChecksum,
              responseCode: 200,
              responseBody: responseBody as object,
              expiresAt,
            },
          });
        } catch (e) {
          console.error('[Idempotency] Failed to store key:', e);
        }
      })
    );
  }
}
