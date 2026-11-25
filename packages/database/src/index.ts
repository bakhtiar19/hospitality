import { PrismaClient } from '@prisma/client';

declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const isDev = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development';
const isProd = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production';

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (!isProd) {
  globalThis.prismaGlobal = prisma;
}

export * from '@prisma/client';
