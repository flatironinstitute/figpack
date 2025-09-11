import { FIGPACK_API_BASE_URL } from "../../config";

interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

interface UsageStats {
  userEmail: string;
  pinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  unpinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  total: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
}

interface ApiResponse {
  success: boolean;
  message?: string;
  user?: User;
  users?: User[];
}

interface UsageStatsResponse {
  success: boolean;
  message?: string;
  stats?: UsageStats;
}

/**
 * Get user profile information
 */
export async function getUserProfile(apiKey: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/user?cb=${Date.now()}`, {
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
  userData: { name: string; researchDescription: string }
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/user?cb=${Date.now()}`, {
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
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/user?cb=${Date.now()}`, {
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

/**
 * Get user usage statistics
 */
export async function getUserUsageStats(apiKey: string, email?: string): Promise<UsageStatsResponse> {
  try {
    const url = new URL(`${FIGPACK_API_BASE_URL}/api/user/usage-stats?cb=${Date.now()}`);
    if (email) {
      url.searchParams.append('email', email);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting usage statistics:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}
