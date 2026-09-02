import { OTPWidget } from '@msg91comm/sendotp-react-native';

// =====================================================
// MSG91 CONFIG
// =====================================================

const MSG91_WIDGET_ID =
  '3669616d5166363839393630';

const MSG91_TOKEN_AUTH =
  '566611Tggh7lY5D6a96d899P1';

// =====================================================
// TYPES
// =====================================================

interface MSG91Response {
  type?: string;
  message?: string;
  reqId?: string;
  requestId?: string;
  accessToken?: string;
  [key: string]: any;
}

// =====================================================
// INITIALIZATION
// =====================================================

let initialized = false;

export async function initializeMSG91(): Promise<void> {
  if (initialized) {
    return;
  }

  await OTPWidget.initializeWidget(
    MSG91_WIDGET_ID,
    MSG91_TOKEN_AUTH,
  );

  initialized = true;

  console.log(
    'MSG91 OTP Widget initialized',
  );
}

// =====================================================
// SEND OTP
// =====================================================

export async function sendMSG91OTP(
  phone: string,
): Promise<MSG91Response> {
  await initializeMSG91();

  const cleanPhone =
    phone.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(
      'Please enter a valid 10-digit mobile number.',
    );
  }

  // MSG91 SDK requires country code
  // WITHOUT the + sign.
  const identifier =
    `91${cleanPhone}`;

  console.log(
    'MSG91 DEBUG - Identifier:',
    identifier,
  );

  try {
    const response =
      await OTPWidget.sendOTP({
        identifier,
      });

    console.log(
      'MSG91 DEBUG - Send OTP Response:',
      JSON.stringify(
        response,
        null,
        2,
      ),
    );

    if (
      !response ||
      response.type !== 'success'
    ) {
      throw new Error(
        response?.message ||
          'Unable to send OTP. Please try again.',
      );
    }

    return response as MSG91Response;
  } catch (error) {
    console.error(
      'MSG91 Send OTP failed:',
      error,
    );

    throw error;
  }
}

// =====================================================
// VERIFY OTP
// =====================================================

export async function verifyMSG91OTP(
  reqId: string,
  otp: string,
): Promise<MSG91Response> {
  await initializeMSG91();

  const cleanReqId =
    reqId.trim();

  const cleanOtp =
    otp.trim();

  if (!cleanReqId) {
    throw new Error(
      'OTP request expired. Please request a new OTP.',
    );
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new Error(
      'Please enter a valid 6-digit OTP.',
    );
  }

  console.log(
    'MSG91 DEBUG - Verifying OTP...',
  );

  try {
    const response =
      await OTPWidget.verifyOTP({
        reqId: cleanReqId,
        otp: cleanOtp,
      });

    console.log(
      'MSG91 DEBUG - Verify OTP Response:',
      JSON.stringify(
        response,
        null,
        2,
      ),
    );

    // -------------------------------------------------
    // MSG91 successful response:
    //
    // {
    //   "message": "<JWT ACCESS TOKEN>",
    //   "type": "success"
    // }
    //
    // Expose the JWT explicitly as accessToken.
    // -------------------------------------------------

    const accessToken =
      response?.accessToken ||
      response?.message;

    if (
      !response ||
      response.type !== 'success'
    ) {
      throw new Error(
        response?.message ||
          'Invalid or expired OTP.',
      );
    }

    if (
      !accessToken ||
      typeof accessToken !== 'string'
    ) {
      console.error(
        'MSG91 DEBUG - No access token returned:',
        JSON.stringify(
          response,
          null,
          2,
        ),
      );

      throw new Error(
        'MSG91 did not return an access token.',
      );
    }

    console.log(
      'MSG91 DEBUG - Access token received successfully.',
    );

    // Return original response + normalized accessToken.
    return {
      ...response,
      accessToken,
    };
  } catch (error) {
    console.error(
      'MSG91 Verify OTP failed:',
      error,
    );

    throw error;
  }
}

// =====================================================
// RETRY OTP
// =====================================================

export async function retryMSG91OTP(
  reqId: string,
  retryChannel?: number,
): Promise<MSG91Response> {
  await initializeMSG91();

  const cleanReqId =
    reqId.trim();

  if (!cleanReqId) {
    throw new Error(
      'OTP request expired. Please request a new OTP.',
    );
  }

  try {
    const response =
      await OTPWidget.retryOTP({
        reqId: cleanReqId,

        ...(retryChannel !== undefined
          ? { retryChannel }
          : {}),
      });

    console.log(
      'MSG91 DEBUG - Retry OTP Response:',
      JSON.stringify(
        response,
        null,
        2,
      ),
    );

    if (
      !response ||
      response.type !== 'success'
    ) {
      throw new Error(
        response?.message ||
          'Unable to resend OTP. Please try again.',
      );
    }

    return response as MSG91Response;
  } catch (error) {
    console.error(
      'MSG91 Retry OTP failed:',
      error,
    );

    throw error;
  }
}