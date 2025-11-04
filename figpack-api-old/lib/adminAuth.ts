import { AuthResult, User, AdminData } from '../types/admin';
import { User as UserModel, IUserDocument } from './db';
import connectDB from './db';
import crypto from 'crypto';

// Simple secure comparison function to replace the one from adminCrypto
function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
}

/**
 * Generates a new API key
 */
export function generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates an API key against the MongoDB user database
 */
export async function validateApiKey(apiKey: string): Promise<AuthResult> {
    try {
        // Connect to database
        await connectDB();

        // Find user with matching API key
        const userDoc: IUserDocument | null = await UserModel.findOne({ apiKey });
        
        if (!userDoc) {
            return { isValid: false, isAdmin: false };
        }

        // Convert MongoDB document to User interface
        const user: User = {
            email: userDoc.email,
            name: userDoc.name,
            researchDescription: userDoc.researchDescription,
            apiKey: userDoc.apiKey,
            isAdmin: userDoc.isAdmin,
            createdAt: new Date(userDoc.createdAt).toISOString()
        };

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
 * Authenticates a user (admin or regular user) using their API key
 */
export async function authenticateUser(apiKey: string): Promise<AuthResult> {
    // First try to validate as regular API key (includes both admin and regular users)
    const apiKeyResult = await validateApiKey(apiKey);
    
    if (apiKeyResult.isValid) {
        return apiKeyResult;
    }

    // If API key validation failed, try bootstrap key
    const bootstrapResult = await validateBootstrapKey(apiKey);
    
    return bootstrapResult;
}

/**
 * Finds a user by email in the MongoDB database
 */
export async function findUserByEmail(email: string): Promise<User | null> {
    try {
        await connectDB();
        const userDoc: IUserDocument | null = await UserModel.findOne({ 
            email: email.toLowerCase() 
        });
        
        if (!userDoc) {
            return null;
        }

        return {
            email: userDoc.email,
            name: userDoc.name,
            researchDescription: userDoc.researchDescription,
            apiKey: userDoc.apiKey,
            isAdmin: userDoc.isAdmin,
            createdAt: new Date(userDoc.createdAt).toISOString()
        };
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
}

/**
 * Gets all users from the MongoDB database
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        await connectDB();
        const userDocs: IUserDocument[] = await UserModel.find({}).sort({ createdAt: 1 });
        
        return userDocs.map(userDoc => ({
            email: userDoc.email,
            name: userDoc.name,
            researchDescription: userDoc.researchDescription,
            apiKey: userDoc.apiKey,
            isAdmin: userDoc.isAdmin,
            createdAt: new Date(userDoc.createdAt).toISOString()
        }));
    } catch (error) {
        console.error('Error getting all users:', error);
        return [];
    }
}

/**
 * Creates a new user in the MongoDB database
 */
export async function createUser(userData: Omit<User, 'createdAt'>): Promise<User | null> {
    try {
        await connectDB();
        
        const newUser = new UserModel({
            email: userData.email.toLowerCase(),
            name: userData.name,
            researchDescription: userData.researchDescription,
            apiKey: userData.apiKey,
            isAdmin: userData.isAdmin,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        const savedUser = await newUser.save();
        
        return {
            email: savedUser.email,
            name: savedUser.name,
            researchDescription: savedUser.researchDescription,
            apiKey: savedUser.apiKey,
            isAdmin: savedUser.isAdmin,
            createdAt: new Date(savedUser.createdAt).toISOString()
        };
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}

/**
 * Updates a user in the MongoDB database
 */
export async function updateUser(email: string, userData: Partial<Omit<User, 'email' | 'createdAt'>>): Promise<User | null> {
    try {
        await connectDB();
        
        const updatedUserDoc = await UserModel.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                ...userData,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!updatedUserDoc) {
            return null;
        }

        return {
            email: updatedUserDoc.email,
            name: updatedUserDoc.name,
            researchDescription: updatedUserDoc.researchDescription,
            apiKey: updatedUserDoc.apiKey,
            isAdmin: updatedUserDoc.isAdmin,
            createdAt: new Date(updatedUserDoc.createdAt).toISOString()
        };
    } catch (error) {
        console.error('Error updating user:', error);
        return null;
    }
}

/**
 * Deletes a user from the MongoDB database
 */
export async function deleteUser(email: string): Promise<boolean> {
    try {
        await connectDB();
        
        const result = await UserModel.deleteOne({ email: email.toLowerCase() });
        return result.deletedCount > 0;
    } catch (error) {
        console.error('Error deleting user:', error);
        return false;
    }
}

/**
 * Regenerates API key for a user
 */
export async function regenerateApiKey(email: string): Promise<User | null> {
    try {
        await connectDB();
        
        const newApiKey = generateApiKey();
        
        const updatedUserDoc = await UserModel.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                apiKey: newApiKey,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!updatedUserDoc) {
            return null;
        }

        return {
            email: updatedUserDoc.email,
            name: updatedUserDoc.name,
            researchDescription: updatedUserDoc.researchDescription,
            apiKey: updatedUserDoc.apiKey,
            isAdmin: updatedUserDoc.isAdmin,
            createdAt: new Date(updatedUserDoc.createdAt).toISOString()
        };
    } catch (error) {
        console.error('Error regenerating API key:', error);
        return null;
    }
}

/**
 * Checks if there are any admin users in the system
 */
export async function hasAdminUsers(): Promise<boolean> {
    try {
        await connectDB();
        const adminCount = await UserModel.countDocuments({ isAdmin: true });
        return adminCount > 0;
    } catch (error) {
        console.error('Error checking for admin users:', error);
        return false;
    }
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
