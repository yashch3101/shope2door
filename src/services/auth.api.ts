import { apiRequest } from './api';
import { getAccessToken } from './auth.storage';

// =====================================================
// USER
// =====================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// =====================================================
// AUTH TOKENS
// =====================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// =====================================================
// AUTH RESPONSE
// =====================================================

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

// =====================================================
// LOGIN
// =====================================================

export interface LoginPayload {
  email: string;
  password: string;
}

// =====================================================
// REGISTER
// =====================================================

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

// =====================================================
// LEGACY CUSTOMER OTP
// =====================================================

export interface RequestLegacyOtpResponse {
  success: boolean;
  message: string;
  data?: {
    expiresInSeconds?: number;
    devOtp?: string;
  };
}

// =====================================================
// REQUEST LEGACY OTP
// POST /api/v1/auth/legacy/request-otp
// =====================================================

export async function requestLegacyOtp(
  phone: string,
): Promise<RequestLegacyOtpResponse> {
  const cleanPhone = phone.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  return apiRequest<RequestLegacyOtpResponse>(
    '/auth/legacy/request-otp',
    {
      method: 'POST',

      body: {
        phone: cleanPhone,
      },
    },
  );
}

// =====================================================
// VERIFY LEGACY OTP
// POST /api/v1/auth/legacy/verify-otp
// =====================================================

export interface VerifyLegacyOtpResponse {
  success: boolean;
  message: string;
  data: {
    user: User & {
      legacyId?: number | null;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export async function verifyLegacyOtp(
  phone: string,
  otp: string,
): Promise<VerifyLegacyOtpResponse> {
  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new Error(
      'Please enter a valid 6-digit OTP.',
    );
  }

  return apiRequest<VerifyLegacyOtpResponse>(
    '/auth/legacy/verify-otp',
    {
      method: 'POST',

      body: {
        phone: cleanPhone,
        otp: cleanOtp,
      },
    },
  );
}

// =====================================================
// LOGIN
// POST /api/v1/auth/login
// =====================================================

export async function login(
  payload: LoginPayload,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/auth/login',
    {
      method: 'POST',

      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      },
    },
  );
}

// =====================================================
// REGISTER
// POST /api/v1/auth/register
// =====================================================

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/auth/register',
    {
      method: 'POST',

      body: {
        name: payload.name.trim(),

        email:
          payload.email
            .trim()
            .toLowerCase(),

        ...(payload.phone?.trim()
          ? {
              phone: payload.phone.trim(),
            }
          : {}),

        password: payload.password,
      },
    },
  );
}

// =====================================================
// NEW CUSTOMER REGISTRATION OTP
// =====================================================

export interface RequestRegisterOtpResponse {
  success: boolean;
  message: string;
  data?: {
    expiresInSeconds?: number;
    devOtp?: string;
  };
}

// =====================================================
// REQUEST REGISTER OTP
// POST /api/v1/auth/register/request-otp
// =====================================================

export async function requestRegisterOtp(
  payload: RegisterPayload,
): Promise<RequestRegisterOtpResponse> {
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const phone = payload.phone?.trim() || '';
  const password = payload.password;

  if (!name || name.length < 2) {
    throw new Error(
      'Please enter your full name.',
    );
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  if (!email) {
    throw new Error(
      'Please enter your email address.',
    );
  }

  if (!password) {
    throw new Error(
      'Please enter your password.',
    );
  }

  return apiRequest<RequestRegisterOtpResponse>(
    '/auth/register/request-otp',
    {
      method: 'POST',

      body: {
        name,
        email,
        phone,
        password,
      },
    },
  );
}

// =====================================================
// VERIFY REGISTER OTP
// POST /api/v1/auth/register/verify-otp
// =====================================================

export interface VerifyRegisterOtpResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export async function verifyRegisterOtp(
  phone: string,
  otp: string,
): Promise<VerifyRegisterOtpResponse> {
  const cleanPhone = phone.trim();
  const cleanOtp = otp.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new Error(
      'Please enter a valid 6-digit OTP.',
    );
  }

  return apiRequest<VerifyRegisterOtpResponse>(
    '/auth/register/verify-otp',
    {
      method: 'POST',

      body: {
        phone: cleanPhone,
        otp: cleanOtp,
      },
    },
  );
}

// =====================================================
// CURRENT USER
// GET /api/v1/auth/me
// =====================================================

export async function getMe(
  accessToken: string,
): Promise<{
  success: boolean;
  message: string;
  data: User;
}> {
  if (!accessToken) {
    throw new Error(
      'Please login to continue.',
    );
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: User;
  }>(
    '/auth/me',
    {
      method: 'GET',
      token: accessToken,
    },
  );
}

// =====================================================
// LOGOUT
// POST /api/v1/auth/logout
// =====================================================

export async function logout(
  accessToken: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  if (!accessToken) {
    return {
      success: true,
      message: 'Already logged out.',
    };
  }

  return apiRequest<{
    success: boolean;
    message: string;
  }>(
    '/auth/logout',
    {
      method: 'POST',
      token: accessToken,
    },
  );
}

// =====================================================
// UPDATE PROFILE
// PATCH /api/v1/auth/profile
// =====================================================

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<{
  success: boolean;
  message: string;
  data: User;
}> {
  const accessToken =
    await getAccessToken();

  if (!accessToken) {
    throw new Error(
      'Please login to update your profile.',
    );
  }

  const cleanPayload: UpdateProfilePayload = {};

  // ---------------------------------------------------
  // Name
  // ---------------------------------------------------

  if (
    typeof payload.name === 'string'
  ) {
    const name =
      payload.name.trim();

    if (name) {
      cleanPayload.name = name;
    }
  }

  // ---------------------------------------------------
  // Phone
  // ---------------------------------------------------

  if (
    typeof payload.phone === 'string'
  ) {
    const phone =
      payload.phone.trim();

    if (phone) {
      cleanPayload.phone = phone;
    }
  }

  // ---------------------------------------------------
  // Prevent empty PATCH request
  // ---------------------------------------------------

  if (
    Object.keys(cleanPayload).length === 0
  ) {
    throw new Error(
      'Please enter the information you want to update.',
    );
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: User;
  }>(
    '/auth/profile',
    {
      method: 'PATCH',
      token: accessToken,
      body: cleanPayload,
    },
  );
}

// =====================================================
// MANUAL REFRESH
// =====================================================
//
// Normally you DO NOT need to call this manually.
// api.ts automatically handles access-token refresh.
//
// Kept here only if some future auth flow needs it.
//

export async function refreshToken(
  refreshTokenValue: string,
): Promise<{
  success: boolean;
  message: string;
  data: AuthTokens;
}> {
  if (!refreshTokenValue) {
    throw new Error(
      'Refresh token is required.',
    );
  }

  return apiRequest<{
    success: boolean;
    message: string;
    data: AuthTokens;
  }>(
    '/auth/refresh',
    {
      method: 'POST',
      token: refreshTokenValue,
    },
  );
}

// =====================================================
// LOGIN OTP
// =====================================================

export interface RequestLoginOtpResponse {
  success: boolean;
  message: string;
  data?: {
    expiresInSeconds?: number;
    devOtp?: string;
  };
}

export async function requestLoginOtp(
  phone: string,
): Promise<RequestLoginOtpResponse> {
  const cleanPhone =
    phone.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  return apiRequest<RequestLoginOtpResponse>(
    '/auth/login/request-otp',
    {
      method: 'POST',

      body: {
        phone: cleanPhone,
      },
    },
  );
}

// =====================================================
// VERIFY LOGIN OTP
// =====================================================

export interface VerifyLoginOtpResponse {
  success: boolean;
  message: string;

  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export async function verifyLoginOtp(
  phone: string,
  otp: string,
): Promise<VerifyLoginOtpResponse> {
  const cleanPhone =
    phone.trim();

  const cleanOtp =
    otp.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new Error(
      'Please enter a valid 6-digit OTP.',
    );
  }

  return apiRequest<VerifyLoginOtpResponse>(
    '/auth/login/verify-otp',
    {
      method: 'POST',

      body: {
        phone: cleanPhone,
        otp: cleanOtp,
      },
    },
  );
}