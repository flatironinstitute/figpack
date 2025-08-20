import type { AdminData } from "./AdminData";
import type { User } from "./UsersSummary";

const validateAdminData = (
    data: AdminData
  ): { valid: boolean; error?: string; data?: AdminData } => {
    try {
      // Basic structure validation
      if (!data || typeof data !== "object") {
        return { valid: false, error: "Data must be an object" };
      }

      if (!Array.isArray(data.users)) {
        return { valid: false, error: "users must be an array" };
      }

      if (!data.version || typeof data.version !== "string") {
        return { valid: false, error: "version must be a string" };
      }

      // Validate each user
      for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i];
        const userPrefix = `users[${i}]`;

        if (
          !user.email ||
          typeof user.email !== "string" ||
          !user.email.includes("@")
        ) {
          return {
            valid: false,
            error: `${userPrefix}.email must be a valid email address`,
          };
        }

        if (
          !user.name ||
          typeof user.name !== "string" ||
          user.name.trim().length === 0
        ) {
          return {
            valid: false,
            error: `${userPrefix}.name must be a non-empty string`,
          };
        }

        if (
          !user.researchDescription ||
          typeof user.researchDescription !== "string"
        ) {
          return {
            valid: false,
            error: `${userPrefix}.researchDescription must be a string`,
          };
        }

        if (
          !user.apiKey ||
          typeof user.apiKey !== "string" ||
          user.apiKey.length !== 64
        ) {
          return {
            valid: false,
            error: `${userPrefix}.apiKey must be a 64-character hex string`,
          };
        }

        if (typeof user.isAdmin !== "boolean") {
          return {
            valid: false,
            error: `${userPrefix}.isAdmin must be a boolean`,
          };
        }

        if (!user.createdAt || typeof user.createdAt !== "string") {
          return {
            valid: false,
            error: `${userPrefix}.createdAt must be an ISO timestamp string`,
          };
        }

        // Validate ISO timestamp
        if (isNaN(Date.parse(user.createdAt))) {
          return {
            valid: false,
            error: `${userPrefix}.createdAt must be a valid ISO timestamp`,
          };
        }
      }

      // Check for duplicate emails
      const emails = data.users.map((u: User) => u.email.toLowerCase());
      const uniqueEmails = new Set(emails);
      if (emails.length !== uniqueEmails.size) {
        return { valid: false, error: "Duplicate email addresses found" };
      }

      // Check for duplicate API keys
      const apiKeys = data.users.map((u: User) => u.apiKey);
      const uniqueApiKeys = new Set(apiKeys);
      if (apiKeys.length !== uniqueApiKeys.size) {
        return { valid: false, error: "Duplicate API keys found" };
      }

      return { valid: true, data };
    } catch (err) {
      return { valid: false, error: `Invalid JSON: ${err}` };
    }
  };

  export default validateAdminData;