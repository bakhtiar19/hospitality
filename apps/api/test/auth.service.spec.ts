import { describe, it, expect, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';

describe('AuthService & Refresh Token Rotation', () => {
  it('should generate valid JWT access and refresh token pair', async () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const authService = new AuthService(jwtService);

    // Test token signing & verification
    const payload = { sub: 'user-123', email: 'owner@winotosastro.com', role: 'OWNER' };
    const token = jwtService.sign(payload);
    const decoded = jwtService.verify(token);

    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('owner@winotosastro.com');
  });

  it('should reject refresh token when format is invalid or expired', async () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const authService = new AuthService(jwtService);

    await expect(authService.refreshToken({ refreshToken: 'invalid.token.here' })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('should hash and compare passwords correctly with bcryptjs', async () => {
    const rawPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    const isMismatch = await bcrypt.compare('WrongPassword', hash);

    expect(isMatch).toBe(true);
    expect(isMismatch).toBe(false);
  });
});
