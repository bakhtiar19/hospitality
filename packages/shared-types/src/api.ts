import { UserPayload } from './models.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    correlationId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserPayload & {
    fullName: string;
    propertyName: string;
  };
}
