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

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'access-token',
) {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    const secret =
      process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not configured',
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
    payload: AccessTokenPayload,
  ) {
    if (!payload?.sub) {
      throw new UnauthorizedException(
        'Invalid access token',
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