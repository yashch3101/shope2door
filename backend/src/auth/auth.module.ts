import { Module } from '@nestjs/common';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  PassportModule,
} from '@nestjs/passport';

import {
  PrismaModule,
} from '../prisma/prisma.module';

import {
  AuthController,
} from './auth.controller';

import {
  AuthService,
} from './auth.service';

import {
  AccessTokenStrategy,
} from './strategies/access-token.strategy';

import {
  RefreshTokenStrategy,
} from './strategies/refresh-token.strategy';

import {
  JwtAuthGuard,
} from './guards/jwt-auth.guard';

import {
  RefreshTokenGuard,
} from './guards/refresh-token.guard';

import {
  RolesGuard,
} from './guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,

    AccessTokenStrategy,
    RefreshTokenStrategy,

    JwtAuthGuard,
    RefreshTokenGuard,
    RolesGuard,
  ],

  exports: [
    AuthService,
    JwtAuthGuard,
    RefreshTokenGuard,
    RolesGuard,
  ],
})
export class AuthModule {}