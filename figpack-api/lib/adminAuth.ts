import { AuthResult, User, AdminData } from '../types/admin';
import { loadAdminData, adminFileExists, hasAdminUsers } from './adminStorage';
import { secureCompare } from './adminCrypto';

/**
 * Validates an API key against the admin data
 */
export async function validateApiKey(apiKey: string): Promise<AuthResult> {
    try {
        const secretKey = process.env.FIGPACK_ADMIN_SECRET_KEY;
        if (!secretKey) {
            console.error('FIGPACK_ADMIN_SECRET_KEY environment variable not set');
            return { isValid: false, isAdmin: false };
        }

        // Load admin data
        const adminData = await loadAdminData(secretKey);
        
        if (!adminData) {
            // No admin file exists
            return { isValid: false, isAdmin: false };
        }

        // Find user with matching API key
        const user = adminData.users.find(u => secureCompare(u.apiKey, apiKey));
        
        if (!user) {
            return { isValid: false, isAdmin: false };
        }

        return {
            isValid: true,
            isAdmin: user.isAdmin,
            user: user
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return { isValid: false, isAdmin: false };
    }
}

/**
 * Validates the bootstrap key
 */
export async function validateBootstrapKey(bootstrapKey: string): Promise<AuthResult> {
    try {
        const expectedBootstrapKey = process.env.BOOTSTRAP_KEY;
        if (!expectedBootstrapKey) {
            console.error('BOOTSTRAP_KEY environment variable not set');
            return { isValid: false, isAdmin: false };
        }

        // Check if bootstrap key matches
        if (!secureCompare(bootstrapKey, expectedBootstrapKey)) {
            return { isValid: false, isAdmin: false };
        }

        // Bootstrap key is always valid when it matches
        return { isValid: true, isAdmin: true, isBootstrap: true };
    } catch (error) {
        console.error('Error validating bootstrap key:', error);
        return { isValid: false, isAdmin: false };
    }
}

/**
 * Authenticates a request using either API key or bootstrap key
 */
export async function authenticateAdmin(apiKey: string): Promise<AuthResult> {
    // First try to validate as regular API key
    const apiKeyResult = await validateApiKey(apiKey);
    
    if (apiKeyResult.isValid && apiKeyResult.isAdmin) {
        return apiKeyResult;
    }

    // If API key validation failed, try bootstrap key
    const bootstrapResult = await validateBootstrapKey(apiKey);
    
    return bootstrapResult;
}

/**
 * Finds a user by email in the admin data
 */
export function findUserByEmail(adminData: AdminData, email: string): User | undefined {
    return adminData.users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

/**
 * Validates user data structure
 */
export function validateUserData(user: any): user is User {
    return (
        typeof user === 'object' &&
        typeof user.email === 'string' &&
        typeof user.name === 'string' &&
        typeof user.researchDescription === 'string' &&
        typeof user.apiKey === 'string' &&
        typeof user.isAdmin === 'boolean' &&
        typeof user.createdAt === 'string' &&
        user.email.includes('@') &&
        user.name.trim().length > 0 &&
        user.apiKey.length > 0
    );
}

/**
 * Validates admin data structure
 */
export function validateAdminData(data: any): data is AdminData {
    return (
        typeof data === 'object' &&
        Array.isArray(data.users) &&
        typeof data.version === 'string' &&
        typeof data.lastModified === 'string' &&
        data.users.every(validateUserData)
    );
}
