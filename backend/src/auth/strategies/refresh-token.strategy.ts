import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import {
  UserRole,
} from '../../generated/prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'refresh';
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    const secret =
      process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured',
      );
    }

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: secret,
    });
  }

  async validate(
    payload: RefreshTokenPayload,
  ) {
    if (
      !payload?.sub ||
      payload.type !== 'refresh'
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },

        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'User not found',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is inactive',
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}