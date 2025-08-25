import { FIGPACK_API_BASE_URL } from '../../config';
import type { User } from './UsersSummary';

interface UserResult {
  success: boolean;
  message?: string;
  user?: User;
}

interface UsersResult {
  success: boolean;
  message?: string;
  users?: User[];
}

// Get all users
export const getUsers = async (apiKey: string): Promise<UsersResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    const result = await response.json();

    if (result.success) {
      // Admin endpoint now only returns users array for admin users
      if (result.users) {
        return { 
          success: true, 
          users: result.users
        };
      } else {
        return { 
          success: false, 
          message: "No user data received" 
        };
      }
    } else {
      return { 
        success: false, 
        message: result.message || "Failed to get users. Make sure you have admin permissions." 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      message: `Error getting users: ${err}` 
    };
  }
};

// Create a new user
export const createUser = async (apiKey: string, user: Omit<User, 'createdAt'>): Promise<UserResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!user) {
    return { success: false, message: "User data is required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        user: user,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { 
        success: true, 
        message: result.message || "User created successfully",
        user: result.user
      };
    } else {
      return { 
        success: false, 
        message: result.message || "Failed to create user" 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      message: `Error creating user: ${err}` 
    };
  }
};

// Update an existing user
export const updateUser = async (apiKey: string, email: string, userData: Partial<Omit<User, 'email' | 'createdAt'>>): Promise<UserResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!email || !userData) {
    return { success: false, message: "Email and user data are required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/users`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        email: email,
        user: userData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { 
        success: true, 
        message: result.message || "User updated successfully",
        user: result.user
      };
    } else {
      return { 
        success: false, 
        message: result.message || "Failed to update user" 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      message: `Error updating user: ${err}` 
    };
  }
};

// Delete a user
export const deleteUser = async (apiKey: string, email: string): Promise<{ success: boolean; message?: string }> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!email) {
    return { success: false, message: "Email is required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/users`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        email: email,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { 
        success: true, 
        message: result.message || "User deleted successfully"
      };
    } else {
      return { 
        success: false, 
        message: result.message || "Failed to delete user" 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      message: `Error deleting user: ${err}` 
    };
  }
};
