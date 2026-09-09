import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

import { CurrentUser } from './decorators/current-user.decorator';

import { RequestLegacyOtpDto } from './dto/request-legacy-otp.dto';
import { VerifyLegacyOtpDto } from './dto/verify-legacy-otp.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =====================================================
  // REGISTER
  // POST /api/v1/auth/register
  // =====================================================

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ) {
    const data =
      await this.authService.register(dto);

    return {
      success: true,
      message: 'Registration successful',
      data,
    };
  }

  // =====================================================
  // NEW CUSTOMER - REQUEST OTP
  // POST /api/v1/auth/register/request-otp
  // =====================================================

  @Post('register/request-otp')
  async requestRegisterOtp(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.requestRegisterOtp(dto);
  }

  // =====================================================
  // NEW CUSTOMER - VERIFY OTP
  // POST /api/v1/auth/register/verify-otp
  // =====================================================

  @Post('register/verify-otp')
  async verifyRegisterOtp(
    @Body()
    dto: {
      phone: string;
      otp: string;
    },
  ) {
    const data =
      await this.authService.verifyRegisterOtp(
        dto.phone,
        dto.otp,
      );

    return {
      success: true,
      message: 'Registration successful',
      data,
    };
  }

  // =====================================================
  // LOGIN
  // POST /api/v1/auth/login
  // =====================================================

  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ) {
    const data =
      await this.authService.login(dto);

    return {
      success: true,
      message: 'Login successful',
      data,
    };
  }

  // =====================================================
  // LEGACY CUSTOMER OTP REQUEST
  // POST /api/v1/auth/legacy/request-otp
  // =====================================================

  @Post('legacy/request-otp')
  async requestLegacyOtp(
    @Body() dto: RequestLegacyOtpDto,
  ) {
    return this.authService.requestLegacyOtp(
      dto.phone,
    );
  }

  // =====================================================
  // LEGACY CUSTOMER OTP VERIFY
  // POST /api/v1/auth/legacy/verify-otp
  // =====================================================

  @Post('legacy/verify-otp')
  async verifyLegacyOtp(
    @Body() dto: VerifyLegacyOtpDto,
  ) {
    const data =
      await this.authService.verifyLegacyOtp(
        dto.phone,
        dto.otp,
      );

    return {
      success: true,
      message:
        'Legacy customer login successful',
      data,
    };
  }

  // =====================================================
  // CUSTOMER LOGIN - REQUEST OTP
  // POST /api/v1/auth/login/request-otp
  // =====================================================

  @Post('login/request-otp')
  async requestLoginOtp(
    @Body()
    dto: {
      phone: string;
    },
  ) {
    return this.authService.requestLegacyOtp(
      dto.phone,
    );
  }

  // =====================================================
  // CUSTOMER LOGIN - VERIFY OTP
  // POST /api/v1/auth/login/verify-otp
  // =====================================================

  @Post('login/verify-otp')
  async verifyLoginOtp(
    @Body()
    dto: {
      phone: string;
      otp: string;
    },
  ) {
    const data =
      await this.authService.verifyLegacyOtp(
        dto.phone,
        dto.otp,
      );

    return {
      success: true,
      message: 'Login successful',
      data,
    };
  }

  // =====================================================
  // CURRENT USER
  // GET /api/v1/auth/me
  // =====================================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data =
      await this.authService.getProfile(user.id);

    return {
      success: true,
      message: 'Profile fetched successfully',
      data,
    };
  }

  // =====================================================
  // UPDATE PROFILE
  // PATCH /api/v1/auth/profile
  // =====================================================

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const data =
      await this.authService.updateProfile(
        user.id,
        dto,
      );

    return {
      success: true,
      message: 'Profile updated successfully',
      data,
    };
  }

  // =====================================================
  // LOGOUT
  // POST /api/v1/auth/logout
  // =====================================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data =
      await this.authService.logout(user.id);

    return {
      success: true,
      ...data,
    };
  }

  // =====================================================
  // REFRESH TOKEN
  // POST /api/v1/auth/refresh
  // =====================================================

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const authorization =
      request.headers.authorization;

    if (
      !authorization ||
      !/^Bearer\s+/i.test(authorization)
    ) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    const refreshToken = authorization
      .replace(/^Bearer\s+/i, '')
      .trim();

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    const data =
      await this.authService.refreshTokens(
        user.id,
        refreshToken,
      );

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data,
    };
  }
}
