import { FIGPACK_API_BASE_URL } from "../../config";

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

/**
 * Get user profile information
 */
export async function getUserProfile(apiKey: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/user?cb=${Date.now()}`, {
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
