import { Env, AuthResult } from "./types";
import { rowToUser, secureCompare } from "./utils";

// --- Authentication Functions ---

export async function validateApiKey(apiKey: string, env: Env): Promise<AuthResult> {
  try {
    const row = await env.figpack_db
      .prepare("SELECT * FROM users WHERE api_key = ?;")
      .bind(apiKey)
      .first();

    if (!row) {
      return { isValid: false, isAdmin: false };
    }

    const user = rowToUser(row);
    return {
      isValid: true,
      isAdmin: user.isAdmin,
      user: user,
    };
  } catch (err) {
    console.error("Error validating API key:", err);
    return { isValid: false, isAdmin: false };
  }
}

export async function validateBootstrapKey(bootstrapKey: string, env: Env): Promise<AuthResult> {
  const expectedBootstrapKey = env.BOOTSTRAP_KEY;
  if (!expectedBootstrapKey) {
    console.error("BOOTSTRAP_KEY not configured");
    return { isValid: false, isAdmin: false };
  }

  if (!secureCompare(bootstrapKey, expectedBootstrapKey)) {
    return { isValid: false, isAdmin: false };
  }

  return { isValid: true, isAdmin: true, isBootstrap: true };
}

export async function authenticateAdmin(apiKey: string, env: Env): Promise<AuthResult> {
  // First try regular API key
  const apiKeyResult = await validateApiKey(apiKey, env);
  if (apiKeyResult.isValid && apiKeyResult.isAdmin) {
    return apiKeyResult;
  }

  // Try bootstrap key
  return await validateBootstrapKey(apiKey, env);
}

export async function authenticateUser(apiKey: string, env: Env): Promise<AuthResult> {
  // First try to validate as regular API key (includes both admin and regular users)
  const apiKeyResult = await validateApiKey(apiKey, env);
  
  if (apiKeyResult.isValid) {
    return apiKeyResult;
  }

  // If API key validation failed, try bootstrap key
  const bootstrapResult = await validateBootstrapKey(apiKey, env);
  
  return bootstrapResult;
}
