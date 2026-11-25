import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Lightweight zero-dependency security headers middleware.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  }
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory sliding-window rate limiter (no Redis required).
 * Protects auth, registration, and public booking endpoints from brute-force / abuse.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private buckets = new Map<string, RateBucket>();
  private lastPruneAt = Date.now();

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url || '';
    let limit = 0;
    let windowMs = 60_000;
    let bucketPrefix = 'general';

    if (path.includes('/auth/login') || path.includes('/auth/register-hotel')) {
      limit = 25;
      windowMs = 15 * 60_000; // 25 requests / 15 min per IP
      bucketPrefix = 'auth';
    } else if (path.includes('/public/')) {
      limit = 60;
      windowMs = 60_000; // 60 requests / 1 min per IP
      bucketPrefix = 'public';
    }

    if (limit === 0) {
      return next();
    }

    const now = Date.now();
    // Periodically prune expired buckets to keep RAM tiny
    if (now - this.lastPruneAt > 60_000 || this.buckets.size > 5000) {
      this.lastPruneAt = now;
      for (const [k, b] of this.buckets.entries()) {
        if (b.resetAt <= now) {
          this.buckets.delete(k);
        }
      }
    }

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
      req.ip ||
      'unknown';

    const key = `${bucketPrefix}:${clientIp}`;
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > limit) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Terlalu banyak percobaan. Silakan coba beberapa saat lagi.',
      });
    }

    return next();
  }
}
