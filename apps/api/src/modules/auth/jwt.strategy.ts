import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserPayload } from '@hospitality/shared-types';
import { getJwtAccessSecret } from '../../common/config/security.config.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload.sub || !payload.email || !payload.propertyId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
