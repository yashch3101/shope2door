import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from './auth.storage';

// =====================================================
// API CONFIG
// =====================================================

const API_BASE_URL = 'https://drop-down-underwire-impulse.ngrok-free.dev/api/v1';

const REQUEST_TIMEOUT = 15000;

// =====================================================
// TYPES
// =====================================================

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

type RefreshResponse = {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

// =====================================================
// TOKEN REFRESH LOCK
// =====================================================
//
// Prevents multiple simultaneous requests from
// refreshing the access token at the same time.
//
// Example:
//
// Request A -> 401
// Request B -> 401
// Request C -> 401
//
// Only ONE refresh request is sent.
//
// A, B and C wait for the same refreshPromise.
//

let refreshPromise: Promise<string | null> | null = null;

// =====================================================
// FRIENDLY ERROR MESSAGE
// =====================================================

function getErrorMessage(
  data: ApiErrorResponse | null,
  status?: number,
): string {
  const message = data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (
    typeof data?.error === 'string' &&
    data.error.trim()
  ) {
    return data.error;
  }

  // ---------------------------------------------------
  // User-friendly fallback messages
  // ---------------------------------------------------

  switch (status) {
    case 400:
      return 'Please check the information and try again.';

    case 401:
      return 'Your session has expired. Please login again.';

    case 403:
      return 'You do not have permission to perform this action.';

    case 404:
      return 'The requested information was not found.';

    case 409:
      return 'This action conflicts with existing data.';

    case 422:
      return 'Please check the entered information.';

    case 429:
      return 'Too many requests. Please try again shortly.';

    case 500:
    case 502:
    case 503:
    case 504:
      return 'Something went wrong on the server. Please try again.';

    default:
      return 'Something went wrong. Please try again.';
  }
}

// =====================================================
// SAFE JSON PARSER
// =====================================================

async function parseResponse(
  response: Response,
): Promise<ApiErrorResponse | Record<string, unknown> | null> {
  try {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  } catch {
    return null;
  }
}

// =====================================================
// FETCH WITH TIMEOUT
// =====================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

async function refreshAccessToken(): Promise<string | null> {
  // ---------------------------------------------------
  // Existing refresh request already running
  // ---------------------------------------------------

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken =
        await getRefreshToken();

      // No refresh token available
      if (!refreshToken) {
        return null;
      }

      let response: Response;

      try {
        response = await fetchWithTimeout(
          `${API_BASE_URL}/auth/refresh`,
          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
              'ngrok-skip-browser-warning': 'true',
              Authorization:
                `Bearer ${refreshToken}`,
            },
          },
        );
      } catch (error: any) {
        // ------------------------------------------------
        // Network / timeout error
        // ------------------------------------------------
        //
        // IMPORTANT:
        // Do NOT clear tokens here.
        //
        // User may simply be offline.
        //

        if (
          error?.name === 'AbortError'
        ) {
          console.log(
            'Token refresh timed out.',
          );
        } else {
          console.log(
            'Token refresh network error:',
            error,
          );
        }

        return null;
      }

      const data =
        (await parseResponse(
          response,
        )) as RefreshResponse | null;

      // ------------------------------------------------
      // Refresh failed
      // ------------------------------------------------

      if (!response.ok) {
        console.log(
          `Token refresh failed with status ${response.status}.`,
        );

        // ------------------------------------------------
        // Invalid/expired refresh token
        // ------------------------------------------------
        //
        // Only clear local tokens when the server
        // explicitly rejects the refresh token.
        //

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          await clearTokens();
        }

        return null;
      }

      // ------------------------------------------------
      // Extract new tokens
      // ------------------------------------------------

      const newAccessToken =
        data?.data?.accessToken;

      const newRefreshToken =
        data?.data?.refreshToken;

      if (
        !newAccessToken ||
        !newRefreshToken
      ) {
        console.log(
          'Token refresh response did not contain valid tokens.',
        );

        return null;
      }

      // ------------------------------------------------
      // Save rotated tokens
      // ------------------------------------------------

      await saveTokens(
        newAccessToken,
        newRefreshToken,
      );

      return newAccessToken;
    } catch (error) {
      console.log(
        'Unexpected token refresh error:',
        error,
      );

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// =====================================================
// API REQUEST
// =====================================================

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
  } = options;

  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method,
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true', 

          ...(body !== undefined && {
            'Content-Type': 'application/json',
          }),

          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        },
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      },
    );
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'The request took too long. Please check your internet connection and try again.',
      );
    }
    console.log(`Network error for ${endpoint}:`, error);
    throw new Error(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
  }

  // ===================================================
  // RESPONSE BODY
  // ===================================================

  const data =
    await parseResponse(response);

  // ===================================================
  // SUCCESS
  // ===================================================

  if (response.ok) {
    return data as T;
  }

  // ===================================================
  // 401 UNAUTHORIZED
  // ===================================================

  const shouldRefreshToken =
    response.status === 401 &&
    !!token &&
    !endpoint.startsWith('/auth/refresh') &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/register') &&
    !endpoint.startsWith('/auth/logout');

  if (shouldRefreshToken) {
    console.log(
      `401 received for ${endpoint}. Attempting token refresh...`,
    );

    // -------------------------------------------------
    // Refresh token
    // -------------------------------------------------

    const newAccessToken =
      await refreshAccessToken();

    // -------------------------------------------------
    // Refresh failed
    // -------------------------------------------------

    if (!newAccessToken) {
      throw new Error(
        'Your session has expired. Please login again.',
      );
    }

    // =================================================
    // RETRY ORIGINAL REQUEST
    // =================================================

    let retryResponse: Response;

    try {
      retryResponse =
        await fetchWithTimeout(
          `${API_BASE_URL}${endpoint}`,
          {
            method,

            headers: {
              Accept: 'application/json',
              'ngrok-skip-browser-warning': 'true',

              ...(body !== undefined && {
                'Content-Type':
                  'application/json',
              }),

              Authorization:
                `Bearer ${newAccessToken}`,
            },

            body:
              body !== undefined
                ? JSON.stringify(body)
                : undefined,
          },
        );
    } catch (error: any) {
      // ------------------------------------------------
      // Retry timeout
      // ------------------------------------------------

      if (
        error?.name === 'AbortError'
      ) {
        throw new Error(
          'The request took too long. Please try again.',
        );
      }

      console.log(
        `Network error while retrying ${endpoint}:`,
        error,
      );

      throw new Error(
        'Unable to connect to the server. Please check your internet connection and try again.',
      );
    }

    // =================================================
    // RETRY RESPONSE
    // =================================================

    const retryData =
      await parseResponse(
        retryResponse,
      );

    // -------------------------------------------------
    // RETRY SUCCESS
    // -------------------------------------------------

    if (retryResponse.ok) {
      return retryData as T;
    }

    // -------------------------------------------------
    // RETRY 401
    // -------------------------------------------------
    //
    // IMPORTANT:
    // Do NOT refresh again.
    //
    // This prevents an infinite refresh loop.
    //

    if (
      retryResponse.status === 401
    ) {
      await clearTokens();

      throw new Error(
        'Your session has expired. Please login again.',
      );
    }

    // -------------------------------------------------
    // RETRY OTHER ERROR
    // -------------------------------------------------

    throw new Error(
      getErrorMessage(
        retryData as ApiErrorResponse | null,
        retryResponse.status,
      ),
    );
  }

  // ===================================================
  // OTHER ERRORS
  // ===================================================

  throw new Error(
    getErrorMessage(
      data as ApiErrorResponse | null,
      response.status,
    ),
  );
}