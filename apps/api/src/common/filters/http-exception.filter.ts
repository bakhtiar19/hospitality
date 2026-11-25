import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) || message;
        errorCode = (r.error as string) || `HTTP_${status}`;
        details = r.details || undefined;
      }
    } else if (exception instanceof Error) {
      const raw = exception.message || '';
      if (
        raw.includes('DATABASE_URL') ||
        raw.includes('Authentication failed against database server') ||
        raw.includes("Can't reach database server") ||
        raw.includes('does not exist on the database server')
      ) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        errorCode = 'DATABASE_UNAVAILABLE';
        message =
          'Database PostgreSQL belum siap atau belum terhubung. Periksa file .env (DATABASE_URL) dan pastikan migrasi Prisma sudah dijalankan.';
        console.error('[DB Error]', raw);
      } else {
        message =
          process.env.NODE_ENV === 'production'
            ? 'Terjadi kesalahan pada server.'
            : raw;
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
