interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  user?: User;
  users?: User[];
}

const API_BASE_URL = 'https://figpack-api.vercel.app';

/**
 * Get user profile information
 */
export async function getUserProfile(apiKey: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  apiKey: string,
  email: string,
  userData: { name: string; researchDescription: string }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        user: userData,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}

/**
 * Regenerate user API key
 */
export async function regenerateUserApiKey(apiKey: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        action: 'regenerate',
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}
