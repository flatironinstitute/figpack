import { FIGPACK_API_BASE_URL } from "../../config";
import type { User } from "./UsersSummary";

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

interface RenewBulkResult {
  success: boolean;
  message?: string;
  renewedCount?: number;
  errors?: Array<{ figureUrl: string; error: string }>;
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

interface UsageStatsResult {
  success: boolean;
  message?: string;
  stats?: UsageStats;
}

export interface UserUsageStats {
  [email: string]: UsageStats;
}

// Renew all figures with backlinks
export const renewBulk = async (apiKey: string): Promise<RenewBulkResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/renew-bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    return {
      success: false,
      message: `Error renewing figures: ${err}`,
    };
  }
};

// Get all users
export const getUsers = async (apiKey: string): Promise<UsersResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/users`, {
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
          users: result.users,
        };
      } else {
        return {
          success: false,
          message: "No user data received",
        };
      }
    } else {
      return {
        success: false,
        message:
          result.message ||
          "Failed to get users. Make sure you have admin permissions.",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error getting users: ${err}`,
    };
  }
};

// Create a new user
export const createUser = async (
  apiKey: string,
  user: Omit<User, "createdAt">,
): Promise<UserResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!user) {
    return { success: false, message: "User data is required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/users`, {
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
        user: result.user,
      };
    } else {
      return {
        success: false,
        message: result.message || "Failed to create user",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error creating user: ${err}`,
    };
  }
};

// Update an existing user
export const updateUser = async (
  apiKey: string,
  email: string,
  userData: Partial<Omit<User, "email" | "createdAt">>,
): Promise<UserResult> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!email || !userData) {
    return { success: false, message: "Email and user data are required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/users`, {
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
        user: result.user,
      };
    } else {
      return {
        success: false,
        message: result.message || "Failed to update user",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error updating user: ${err}`,
    };
  }
};

// Delete a user
export const deleteUser = async (
  apiKey: string,
  email: string,
): Promise<{ success: boolean; message?: string }> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!email) {
    return { success: false, message: "Email is required" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/users`, {
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
        message: result.message || "User deleted successfully",
      };
    } else {
      return {
        success: false,
        message: result.message || "Failed to delete user",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error deleting user: ${err}`,
    };
  }
};

// Get usage statistics for all users
export const getAllUsersUsageStats = async (
  apiKey: string,
  users: User[],
): Promise<{
  success: boolean;
  message?: string;
  usageStats?: UserUsageStats;
}> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!users || users.length === 0) {
    return { success: true, usageStats: {} };
  }

  try {
    // Fetch usage stats for each user in parallel
    const promises = users.map(async (user) => {
      try {
        const response = await fetch(
          `${FIGPACK_API_BASE_URL}/user/usage-stats?email=${encodeURIComponent(user.email)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
          },
        );

        const result: UsageStatsResult = await response.json();

        if (result.success && result.stats) {
          return { email: user.email, stats: result.stats };
        } else {
          console.warn(
            `Failed to get usage stats for ${user.email}:`,
            result.message,
          );
          return null;
        }
      } catch (error) {
        console.warn(`Error fetching usage stats for ${user.email}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Build the usage stats object
    const usageStats: UserUsageStats = {};
    let successCount = 0;

    results.forEach((result) => {
      if (result) {
        usageStats[result.email] = result.stats;
        successCount++;
      }
    });

    return {
      success: true,
      message: `Successfully loaded usage statistics for ${successCount} of ${users.length} users`,
      usageStats,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error getting usage statistics: ${err}`,
    };
  }
};
