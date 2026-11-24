import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | bigint, currency: string = 'IDR'): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatThousands(value: number | string | undefined | null): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseThousands(value) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function parseThousands(value: string | number | undefined | null): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const clean = value.replace(/\D/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

