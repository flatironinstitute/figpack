import { AdminData } from '../types/admin';
import { Bucket, getObjectContent, putObject, objectExists } from './s3Helpers';
import { encryptAdminData, decryptAdminData } from './adminCrypto';

const ADMIN_FILE_KEY = 'figpack-admin.json';

// Get the bucket configuration
const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://figpack-figures',
    credentials: bucketCredentials
};

/**
 * Checks if the admin file exists in S3
 */
export async function adminFileExists(): Promise<boolean> {
    try {
        return await objectExists(bucket, ADMIN_FILE_KEY);
    } catch (error) {
        console.error('Error checking admin file existence:', error);
        return false;
    }
}

/**
 * Loads and decrypts the admin data from S3
 */
export async function loadAdminData(secretKey: string): Promise<AdminData | null> {
    try {
        const exists = await adminFileExists();
        if (!exists) {
            return null;
        }

        const encryptedContent = await getObjectContent(bucket, ADMIN_FILE_KEY);
        if (!encryptedContent) {
            return null;
        }

        // Convert Buffer to string
        const encryptedString = encryptedContent.toString('utf8');
        
        // Decrypt the content
        const decryptedContent = decryptAdminData(encryptedString, secretKey);
        
        // Parse JSON
        const adminData: AdminData = JSON.parse(decryptedContent);
        
        return adminData;
    } catch (error) {
        console.error('Error loading admin data:', error);
        throw new Error('Failed to load admin data');
    }
}

/**
 * Encrypts and saves the admin data to S3
 */
export async function saveAdminData(adminData: AdminData, secretKey: string): Promise<void> {
    try {
        // Update the lastModified timestamp
        adminData.lastModified = new Date().toISOString();
        
        // Convert to JSON string
        const jsonContent = JSON.stringify(adminData, null, 2);
        
        // Encrypt the content
        const encryptedContent = encryptAdminData(jsonContent, secretKey);
        
        // Upload to S3
        await putObject(bucket, {
            Bucket: 'figpack-figures', // Use the actual bucket name
            Key: ADMIN_FILE_KEY,
            Body: encryptedContent,
            ContentType: 'application/json',
            Metadata: {
                'figpack-admin': 'true',
                'version': adminData.version
            }
        });
        
        console.log('Admin data saved successfully');
    } catch (error) {
        console.error('Error saving admin data:', error);
        throw new Error('Failed to save admin data');
    }
}

/**
 * Creates initial admin data structure
 */
export function createInitialAdminData(): AdminData {
    return {
        users: [],
        version: '1.0.0',
        lastModified: new Date().toISOString()
    };
}

/**
 * Checks if there are any admin users in the system
 */
export function hasAdminUsers(adminData: AdminData): boolean {
    return adminData.users.some(user => user.isAdmin);
}
