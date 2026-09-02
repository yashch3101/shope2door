import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';

import { randomInt } from 'crypto';

import * as bcrypt from 'bcrypt';

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
      throw new Error(
        'JWT_ACCESS_SECRET is not configured',
      );
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured',
      );
    }
  }

  // =====================================================
  // REGISTER
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
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException(
          'Email is already registered',
        );
      }

      if (
        phone &&
        existingUser.phone === phone
      ) {
        throw new ConflictException(
          'Phone number is already registered',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      12,
    );

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
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Email or phone number is already registered',
        );
      }

      throw error;
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.updateRefreshTokenHash(
      user.id,
      tokens.refreshToken,
    );

    return {
      user,
      ...tokens,
    };
  }

  // =====================================================
  // FAST2SMS OTP DELIVERY
  // =====================================================

  private async sendOtpSms(
    phone: string,
    otp: string,
    purpose: 'registration' | 'login',
  ): Promise<void> {
    const apiKey =
      process.env.FAST2SMS_API_KEY?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'SMS service is not configured',
      );
    }

    const message =
      purpose === 'registration'
        ? `Your Shop2Door registration OTP is ${otp}. It is valid for 5 minutes.`
        : `Your Shop2Door login OTP is ${otp}. It is valid for 5 minutes.`;

    try {
      const url = new URL(
        'https://www.fast2sms.com/dev/bulkV2',
      );

      url.searchParams.set('route', 'q');
      url.searchParams.set('message', message);
      url.searchParams.set('numbers', phone);

      const response = await fetch(
        url.toString(),
        {
          method: 'GET',

          headers: {
            Authorization: apiKey,
            Accept: 'application/json',
          },
        },
      );

      const responseText =
        await response.text();

      let result: any = null;

      try {
        result =
          JSON.parse(responseText);
      } catch {
        result = null;
      }

      if (
        !response.ok ||
        result?.return === false
      ) {
        console.error(
          'Fast2SMS OTP request failed:',
          {
            status: response.status,
            response: result ?? responseText,
          },
        );

        throw new Error(
          'Fast2SMS rejected the OTP request',
        );
      }

      console.log(
        `📱 OTP SMS requested successfully for ${phone}`,
      );
    } catch (error) {
      console.error(
        'Fast2SMS OTP delivery error:',
        error,
      );

      throw new ServiceUnavailableException(
        'Unable to send OTP. Please try again later.',
      );
    }
  }

  // =====================================================
  // NEW CUSTOMER - REQUEST OTP
  // POST /api/v1/auth/register/request-otp
  // =====================================================

  async requestRegisterOtp(dto: RegisterDto) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || '';

    if (!name || name.length < 2) {
      throw new ConflictException(
        'Name must be at least 2 characters',
      );
    }

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new ConflictException(
        'A valid 10-digit phone number is required',
      );
    }

    // ---------------------------------------------------
    // Check existing account
    // ---------------------------------------------------

    const existingByEmail =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          isActive: true,
          legacyId: true,
        },
      });

    const existingByPhone =
      await this.prisma.user.findFirst({
        where: {
          phone,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          isActive: true,
          legacyId: true,
        },
      });

    // Existing legacy customer
    if (
      existingByPhone?.legacyId !== null &&
      existingByPhone?.legacyId !== undefined
    ) {
      throw new ConflictException(
        'This phone number belongs to an existing customer. Please use customer login.',
      );
    }

    // Email belongs to another account
    if (
      existingByEmail &&
      existingByEmail.phone !== phone
    ) {
      throw new ConflictException(
        'Email is already registered',
      );
    }

    // Phone belongs to another account
    if (
      existingByPhone &&
      existingByPhone.email !== email
    ) {
      throw new ConflictException(
        'Phone number is already registered',
      );
    }

    // ---------------------------------------------------
    // Hash password
    // ---------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(
        dto.password,
        12,
      );

    let userId: string;

    // ---------------------------------------------------
    // Create pending user
    // ---------------------------------------------------

    if (!existingByEmail && !existingByPhone) {
      const user =
        await this.prisma.user.create({
          data: {
            name,
            email,
            phone,
            password: hashedPassword,
            role: UserRole.CUSTOMER,

            // Account becomes active only after OTP verification
            isActive: false,
          },

          select: {
            id: true,
          },
        });

      userId = user.id;
    } else {
      // Existing inactive registration waiting for OTP.
      // Allow the customer to request a fresh OTP.
      const existing =
        existingByEmail || existingByPhone;

      if (!existing) {
        throw new ConflictException(
          'Unable to process registration',
        );
      }

      if (existing.isActive) {
        throw new ConflictException(
          'This account is already registered',
        );
      }

      const user =
        await this.prisma.user.update({
          where: {
            id: existing.id,
          },

          data: {
            name,
            email,
            phone,
            password: hashedPassword,
          },

          select: {
            id: true,
          },
        });

      userId = user.id;
    }

    // ---------------------------------------------------
    // Remove previous OTP
    // ---------------------------------------------------

    await this.prisma.legacyOtpChallenge.deleteMany({
      where: {
        userId,
        consumedAt: null,
      },
    });

    // ---------------------------------------------------
    // Generate OTP
    // ---------------------------------------------------

    const otp =
      randomInt(
        100000,
        1000000,
      ).toString();

    const otpHash =
      await bcrypt.hash(
        otp,
        12,
      );

    const expiresAt =
      new Date(
        Date.now() +
          5 * 60 * 1000,
      );

    await this.prisma.legacyOtpChallenge.create({
      data: {
        userId,
        otpHash,
        expiresAt,
      },
    });

    // ---------------------------------------------------
    // TEMPORARY DEMO MODE
    // ---------------------------------------------------

    // =====================================================
    // OTP DELIVERY
    // =====================================================

    const demoOtpEnabled =
      process.env.LEGACY_OTP_DEMO === 'true' ||
      process.env.OTP_DEMO === 'true';

    if (demoOtpEnabled) {
      console.log(
        `🔐 REGISTRATION OTP for ${phone}: ${otp}`,
      );

      return {
        success: true,

        message:
          'OTP generated successfully',

        data: {
          expiresInSeconds: 300,

          // Development only
          devOtp: otp,
        },
      };
    }

    // =====================================================
    // PRODUCTION SMS
    // =====================================================

    try {
      await this.sendOtpSms(
        phone,
        otp,
        'registration',
      );
    } catch (error) {
      // Do not leave an OTP challenge
      // that the customer never received.

      await this.prisma.legacyOtpChallenge.deleteMany({
        where: {
          userId,
          consumedAt: null,
        },
      });

      throw error;
    }

    return {
      success: true,

      message: 'OTP sent successfully',

      data: {
        expiresInSeconds: 300,
      },
    };
  }

  // =====================================================
  // NEW CUSTOMER - VERIFY OTP
  // POST /api/v1/auth/register/verify-otp
  // =====================================================

  async verifyRegisterOtp(
    phone: string,
    otp: string,
  ) {
    const cleanPhone =
      phone.trim();

    const user =
      await this.prisma.user.findFirst({
        where: {
          phone: cleanPhone,

          // New registrations only
          legacyId: null,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid OTP',
      );
    }

    // Already verified account
    if (user.isActive) {
      throw new ConflictException(
        'Account is already verified. Please login.',
      );
    }

    const challenge =
      await this.prisma.legacyOtpChallenge.findFirst({
        where: {
          userId: user.id,

          consumedAt: null,

          expiresAt: {
            gt: new Date(),
          },

          attempts: {
            lt: 5,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!challenge) {
      throw new UnauthorizedException(
        'OTP expired or invalid. Please request a new OTP.',
      );
    }

    const otpMatches =
      await bcrypt.compare(
        otp,
        challenge.otpHash,
      );

    if (!otpMatches) {
      await this.prisma.legacyOtpChallenge.update({
        where: {
          id: challenge.id,
        },

        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException(
        'Invalid OTP',
      );
    }

    // ---------------------------------------------------
    // Consume OTP + activate account
    // ---------------------------------------------------

    await this.prisma.$transaction([
      this.prisma.legacyOtpChallenge.update({
        where: {
          id: challenge.id,
        },

        data: {
          consumedAt: new Date(),
        },
      }),

      this.prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          isActive: true,
        },
      }),
    ]);

    // ---------------------------------------------------
    // Generate login tokens
    // ---------------------------------------------------

    const tokens =
      await this.generateTokens(
        user.id,
        user.email,
        user.role,
      );

    await this.updateRefreshTokenHash(
      user.id,
      tokens.refreshToken,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: true,
        createdAt: user.createdAt,
      },

      ...tokens,
    };
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is inactive',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.updateRefreshTokenHash(
      user.id,
      tokens.refreshToken,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  // =====================================================
  // LEGACY CUSTOMER - REQUEST OTP
  // =====================================================

  async requestLegacyOtp(
    phone: string,
  ) {
    const cleanPhone = phone.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new BadRequestException(
        'Please enter a valid 10-digit mobile number.',
      );
    }

    const user =
      await this.prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          isActive: true,
        },

        select: {
          id: true,
          phone: true,
        },
      });

    // Do not reveal whether an account exists.
    if (!user) {
      return {
        success: true,
        message:
          'If this mobile number is registered, an OTP has been sent.',
      };
    }

    // Remove previous active OTPs.
    await this.prisma.legacyOtpChallenge.deleteMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
    });

    // Generate 6-digit OTP.
    const otp =
      randomInt(
        100000,
        1000000,
      ).toString();

    const otpHash =
      await bcrypt.hash(
        otp,
        12,
      );

    const expiresAt =
      new Date(
        Date.now() +
          5 * 60 * 1000,
      );

    await this.prisma.legacyOtpChallenge.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    // ---------------------------------------------------
    // DEVELOPMENT MODE
    // ---------------------------------------------------

    const demoOtpEnabled =
      process.env.LEGACY_OTP_DEMO === 'true' ||
      process.env.OTP_DEMO === 'true';

    if (demoOtpEnabled) {
      console.log(
        `🔐 LOGIN OTP for ${cleanPhone}: ${otp}`,
      );

      return {
        success: true,
        message: 'OTP generated successfully',
        data: {
          expiresInSeconds: 300,
          devOtp: otp,
        },
      };
    }

    // ---------------------------------------------------
    // FAST2SMS
    // ---------------------------------------------------

    try {
      await this.sendOtpSms(
        cleanPhone,
        otp,
        'login',
      );
    } catch (error) {
      await this.prisma.legacyOtpChallenge.deleteMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
      });

      throw error;
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        expiresInSeconds: 300,
      },
    };
  }

  // =====================================================
  // LEGACY CUSTOMER - VERIFY OTP
  // =====================================================

  async verifyLegacyOtp(
    phone: string,
    otp: string,
  ) {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new BadRequestException(
        'Please enter a valid 10-digit mobile number.',
      );
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new BadRequestException(
        'Please enter a valid 6-digit OTP.',
      );
    }

    const user =
      await this.prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          isActive: true,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid OTP.',
      );
    }

    const challenge =
      await this.prisma.legacyOtpChallenge.findFirst({
        where: {
          userId: user.id,

          consumedAt: null,

          expiresAt: {
            gt: new Date(),
          },

          attempts: {
            lt: 5,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!challenge) {
      throw new UnauthorizedException(
        'OTP expired or invalid. Please request a new OTP.',
      );
    }

    const otpMatches =
      await bcrypt.compare(
        cleanOtp,
        challenge.otpHash,
      );

    if (!otpMatches) {
      await this.prisma.legacyOtpChallenge.update({
        where: {
          id: challenge.id,
        },

        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException(
        'Invalid OTP.',
      );
    }

    // Consume OTP BEFORE issuing tokens.
    await this.prisma.legacyOtpChallenge.update({
      where: {
        id: challenge.id,
      },

      data: {
        consumedAt: new Date(),
      },
    });

    const tokens =
      await this.generateTokens(
        user.id,
        user.email,
        user.role,
      );

    await this.updateRefreshTokenHash(
      user.id,
      tokens.refreshToken,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      ...tokens,
    };
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(userId: string) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        refreshTokenHash: null,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  // =====================================================
  // REFRESH TOKENS
  // =====================================================

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    const newRefreshTokenHash =
      await bcrypt.hash(
        tokens.refreshToken,
        12,
      );

    /*
     * Atomic refresh-token rotation.
     *
     * This prevents two simultaneous requests
     * from successfully rotating the same old
     * refresh token.
     */
    const rotationResult =
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          refreshTokenHash: user.refreshTokenHash,
        },

        data: {
          refreshTokenHash:
            newRefreshTokenHash,
        },
      });

    if (rotationResult.count !== 1) {
      throw new UnauthorizedException(
        'Refresh token has already been used',
      );
    }

    return tokens;
  }

  // =====================================================
  // GET PROFILE
  // =====================================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    return user;
  }

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const name =
      dto.name !== undefined
        ? dto.name.trim()
        : undefined;

    const phone =
      dto.phone !== undefined
        ? dto.phone.trim() || null
        : undefined;

    if (
      name !== undefined &&
      name.length < 2
    ) {
      throw new ConflictException(
        'Name must be at least 2 characters',
      );
    }

    if (
      phone &&
      !/^[6-9]\d{9}$/.test(phone)
    ) {
      throw new ConflictException(
        'Please enter a valid 10-digit phone number',
      );
    }

    if (phone) {
      const existingUser =
        await this.prisma.user.findFirst({
          where: {
            phone,
            NOT: {
              id: userId,
            },
          },

          select: {
            id: true,
          },
        });

      if (existingUser) {
        throw new ConflictException(
          'This phone number is already registered with another account',
        );
      }
    }

    const updateData: {
      name?: string;
      phone?: string | null;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (dto.phone !== undefined) {
      updateData.phone = phone ?? null;
    }

    /*
     * Nothing to update.
     */
    if (Object.keys(updateData).length === 0) {
      return this.getProfile(userId);
    }

    try {
      const user =
        await this.prisma.user.update({
          where: {
            id: userId,
          },

          data: updateData,

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      return user;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Phone number is already registered',
        );
      }

      throw error;
    }
  }

  // =====================================================
  // GENERATE ACCESS + REFRESH TOKENS
  // =====================================================

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const refreshPayload = {
      ...payload,
      type: 'refresh' as const,
    };

    const accessExpiresIn =
      (process.env.JWT_ACCESS_EXPIRES_IN ||
        '15m') as SignOptions['expiresIn'];

    const refreshExpiresIn =
      (process.env.JWT_REFRESH_EXPIRES_IN ||
        '7d') as SignOptions['expiresIn'];

    const [accessToken, refreshToken] =
      await Promise.all([
        this.jwtService.signAsync(
          payload,
          {
            secret:
              process.env.JWT_ACCESS_SECRET!,
            expiresIn:
              accessExpiresIn,
          },
        ),

        this.jwtService.signAsync(
          refreshPayload,
          {
            secret:
              process.env.JWT_REFRESH_SECRET!,
            expiresIn:
              refreshExpiresIn,
          },
        ),
      ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  // =====================================================
  // HASH + STORE REFRESH TOKEN
  // =====================================================

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ) {
    const hash = await bcrypt.hash(
      refreshToken,
      12,
    );

    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        refreshTokenHash: hash,
      },
    });
  }
}