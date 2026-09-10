import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import type { SignOptions } from 'jsonwebtoken';

import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../generated/prisma/client';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.validateJwtConfiguration();
  }

  // =====================================================
  // CONFIGURATION VALIDATION
  // =====================================================

  private validateJwtConfiguration() {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
  }

  // =====================================================
  // 2FACTOR API INTEGRATION
  // =====================================================

  private async sendGetOTP(phone: string): Promise<void> {
    const apiKey = process.env.TWOFACTOR_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('2Factor API key is missing in .env');

    try {
      // 2Factor AUTOGEN API (Khud 6-digit OTP banayega)
      await axios.get(
        `https://2factor.in/API/V1/${apiKey}/SMS/91${phone}/AUTOGEN`
      );
    } catch (error: any) {
      console.error('2Factor Send Error:', error.response?.data || error.message);
      throw new ServiceUnavailableException('Unable to send OTP via 2Factor.');
    }
  }

  private async verifyGetOTP(phone: string, otp: string): Promise<boolean> {
    const apiKey = process.env.TWOFACTOR_API_KEY?.trim();
    if (!apiKey) throw new ServiceUnavailableException('2Factor API key is missing in .env');

    try {
      // 2Factor VERIFY3 API
      const response = await axios.get(
        `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/91${phone}/${otp}`
      );
      
      // Agar status 'Success' hai, toh OTP valid hai
      if (response.data && response.data.Status === 'Success') {
        return true;
      }
      return false; 
    } catch (error: any) {
      console.error('2Factor Verify Error:', error.response?.data || error.message);
      return false;
    }
  }

  // =====================================================
  // REGISTER (EMAIL/PASSWORD)
  // =====================================================

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true, email: true, phone: true },
    });

    if (existingUser) {
      if (existingUser.email === email) throw new ConflictException('Email is already registered');
      if (phone && existingUser.phone === phone) throw new ConflictException('Phone number is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    let user;

    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          phone,
          password: hashedPassword,
          role: UserRole.CUSTOMER,
          isActive: true,
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Email or phone number is already registered');
      throw error;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  // =====================================================
  // NEW CUSTOMER - REQUEST OTP
  // =====================================================

  async requestRegisterOtp(dto: RegisterDto) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || '';

    if (!name || name.length < 2) throw new ConflictException('Name must be at least 2 characters');
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) throw new ConflictException('A valid 10-digit phone number is required');

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, phone: true, isActive: true, legacyId: true },
    });

    const existingByPhone = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, email: true, phone: true, isActive: true, legacyId: true },
    });

    if (existingByPhone?.legacyId !== null && existingByPhone?.legacyId !== undefined) {
      throw new ConflictException('This phone number belongs to an existing customer. Please use customer login.');
    }

    if (existingByEmail && existingByEmail.phone !== phone) throw new ConflictException('Email is already registered');
    if (existingByPhone && existingByPhone.email !== email) throw new ConflictException('Phone number is already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    let userId: string;

    if (!existingByEmail && !existingByPhone) {
      const user = await this.prisma.user.create({
        data: {
          name, email, phone, password: hashedPassword, role: UserRole.CUSTOMER, isActive: false,
        },
        select: { id: true },
      });
      userId = user.id;
    } else {
      const existing = existingByEmail || existingByPhone;
      if (!existing) throw new ConflictException('Unable to process registration');
      if (existing.isActive) throw new ConflictException('This account is already registered');

      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: { name, email, phone, password: hashedPassword },
        select: { id: true },
      });
      userId = user.id;
    }

    const demoOtpEnabled = process.env.LEGACY_OTP_DEMO === 'true' || process.env.OTP_DEMO === 'true';
    if (demoOtpEnabled) {
      return { success: true, message: 'OTP generated successfully', data: { expiresInSeconds: 300, devOtp: '123456' } };
    }

    await this.sendGetOTP(phone);

    return { success: true, message: 'OTP sent successfully', data: { expiresInSeconds: 300 } };
  }

  // =====================================================
  // NEW CUSTOMER - VERIFY OTP
  // =====================================================

  async verifyRegisterOtp(phone: string, otp: string) {
    const cleanPhone = phone.trim();
    const user = await this.prisma.user.findFirst({
      where: { phone: cleanPhone, legacyId: null },
    });

    if (!user) throw new UnauthorizedException('Invalid Request');
    if (user.isActive) throw new ConflictException('Account is already verified. Please login.');

    // GETOTP Verification
    const demoOtpEnabled = process.env.LEGACY_OTP_DEMO === 'true' || process.env.OTP_DEMO === 'true';
    const isValid = demoOtpEnabled ? (otp === '123456') : await this.verifyGetOTP(cleanPhone, otp.trim());

    if (!isValid) throw new UnauthorizedException('Invalid or Expired OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: true, createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  // =====================================================
  // LOGIN (EMAIL/PASSWORD)
  // =====================================================

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid email or password');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive, createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  // =====================================================
  // LEGACY CUSTOMER - REQUEST OTP
  // =====================================================

  async requestLegacyOtp(phone: string) {
    const cleanPhone = phone.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) throw new BadRequestException('Please enter a valid 10-digit mobile number.');

    const user = await this.prisma.user.findFirst({
      where: { phone: cleanPhone, isActive: true },
      select: { id: true, phone: true },
    });

    if (!user) return { success: true, message: 'If this mobile number is registered, an OTP has been sent.' };

    const demoOtpEnabled = process.env.LEGACY_OTP_DEMO === 'true' || process.env.OTP_DEMO === 'true';
    if (demoOtpEnabled) {
      return { success: true, message: 'OTP generated successfully', data: { expiresInSeconds: 300, devOtp: '123456' } };
    }

    await this.sendGetOTP(cleanPhone);

    return { success: true, message: 'OTP sent successfully', data: { expiresInSeconds: 300 } };
  }

  // =====================================================
  // LEGACY CUSTOMER - VERIFY OTP
  // =====================================================

  async verifyLegacyOtp(phone: string, otp: string) {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) throw new BadRequestException('Invalid mobile number.');
    if (!/^\d{4,6}$/.test(cleanOtp)) throw new BadRequestException('Please enter a valid OTP.');

    const user = await this.prisma.user.findFirst({
      where: { phone: cleanPhone, isActive: true },
    });

    if (!user) throw new UnauthorizedException('Invalid OTP.');

    // GETOTP Verification
    const demoOtpEnabled = process.env.LEGACY_OTP_DEMO === 'true' || process.env.OTP_DEMO === 'true';
    const isValid = demoOtpEnabled ? (cleanOtp === '123456') : await this.verifyGetOTP(cleanPhone, cleanOtp);

    if (!isValid) throw new UnauthorizedException('OTP expired or invalid. Please request a new OTP.');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Logged out successfully' };
  }

  // =====================================================
  // REFRESH TOKENS
  // =====================================================

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !user.refreshTokenHash) throw new UnauthorizedException('Invalid refresh token');

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

    const rotationResult = await this.prisma.user.updateMany({
      where: { id: user.id, refreshTokenHash: user.refreshTokenHash },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    if (rotationResult.count !== 1) throw new UnauthorizedException('Refresh token has already been used');
    return tokens;
  }

  // =====================================================
  // GET PROFILE
  // =====================================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    return user;
  }

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    const phone = dto.phone !== undefined ? dto.phone.trim() || null : undefined;

    if (name !== undefined && name.length < 2) throw new ConflictException('Name must be at least 2 characters');
    if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new ConflictException('Please enter a valid 10-digit phone number');

    if (phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (existingUser) throw new ConflictException('This phone number is already registered with another account');
    }

    const updateData: { name?: string; phone?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (dto.phone !== undefined) updateData.phone = phone ?? null;

    if (Object.keys(updateData).length === 0) return this.getProfile(userId);

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true,
        },
      });
      return user;
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Phone number is already registered');
      throw error;
    }
  }

  // =====================================================
  // GENERATE ACCESS + REFRESH TOKENS
  // =====================================================

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    const refreshPayload = { ...payload, type: 'refresh' as const };

    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET!, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(refreshPayload, { secret: process.env.JWT_REFRESH_SECRET!, expiresIn: refreshExpiresIn }),
    ]);

    return { accessToken, refreshToken };
  }

  // =====================================================
  // HASH + STORE REFRESH TOKEN
  // =====================================================

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}