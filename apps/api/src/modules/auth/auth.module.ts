import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { getJwtAccessSecret } from '../../common/config/security.config.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtAccessSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, PermissionsGuard],
  exports: [AuthService, JwtStrategy, RolesGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}
