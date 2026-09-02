import * as SecureStore from 'expo-secure-store';

// =====================================================
// STORAGE KEYS
// =====================================================

const ACCESS_TOKEN_KEY =
  'shop2door_access_token';

const REFRESH_TOKEN_KEY =
  'shop2door_refresh_token';

// =====================================================
// SAVE TOKENS
// =====================================================

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  if (
    !accessToken ||
    !refreshToken
  ) {
    throw new Error(
      'Invalid authentication tokens.',
    );
  }

  try {
    await Promise.all([
      SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        accessToken,
      ),

      SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        refreshToken,
      ),
    ]);
  } catch (error) {
    console.log(
      'Failed to save authentication tokens:',
      error,
    );

    throw new Error(
      'Unable to save your login session. Please try again.',
    );
  }
}

// =====================================================
// GET ACCESS TOKEN
// =====================================================

export async function getAccessToken(): Promise<
  string | null
> {
  try {
    return await SecureStore.getItemAsync(
      ACCESS_TOKEN_KEY,
    );
  } catch (error) {
    console.log(
      'Failed to read access token:',
      error,
    );

    return null;
  }
}

// =====================================================
// GET REFRESH TOKEN
// =====================================================

export async function getRefreshToken(): Promise<
  string | null
> {
  try {
    return await SecureStore.getItemAsync(
      REFRESH_TOKEN_KEY,
    );
  } catch (error) {
    console.log(
      'Failed to read refresh token:',
      error,
    );

    return null;
  }
}

// =====================================================
// CLEAR TOKENS
// =====================================================

export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(
        ACCESS_TOKEN_KEY,
      ),

      SecureStore.deleteItemAsync(
        REFRESH_TOKEN_KEY,
      ),
    ]);
  } catch (error) {
    console.log(
      'Failed to clear authentication tokens:',
      error,
    );

    // -------------------------------------------------
    // Do not throw here.
    //
    // Logout should not crash the application just
    // because SecureStore cleanup failed.
    // -------------------------------------------------
  }
}