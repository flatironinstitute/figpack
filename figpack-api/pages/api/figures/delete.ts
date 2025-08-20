import { NextApiRequest, NextApiResponse } from 'next';
import { Figure } from '../../../lib/db';
import { validateApiKey } from '../../../lib/adminAuth';

import { Bucket, deleteObjects, listObjects } from '../../../lib/s3Helpers';
import connectDB from '../../../lib/db';

interface DeleteFigureRequest {
    figureId: string;
    apiKey: string;
}

interface DeleteFigureResponse {
    success: boolean;
    message?: string;
}

// Get the bucket configuration
const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://figpack-figures',
    credentials: bucketCredentials
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<DeleteFigureResponse>
) {
    // Set CORS headers
    const allowedOrigins = [
        'https://manage.figpack.org',
        'http://localhost:5173',
        'http://localhost:5174'
    ];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }

    try {
        const { figureId, apiKey }: DeleteFigureRequest = req.body;

        // Validate required fields
        if (!figureId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: figureId'
            });
        }

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }

        // Authenticate API key
        const authResult = await validateApiKey(apiKey);
        if (!authResult.isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
        }

        // Connect to database
        await connectDB();

        // Find the figure
        const figure = await Figure.findOne({ figureId });

        if (!figure) {
            return res.status(404).json({
                success: false,
                message: 'Figure not found'
            });
        }

        // Check if user is the owner
        if (figure.ownerEmail !== authResult.user?.email) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this figure'
            });
        }

        // Delete files from S3
        const prefix = `figures/default/${figureId}/`;
        let continuationToken: string | undefined;
        const objectsToDelete: string[] = [];
        
        do {
            const result = await listObjects(bucket, prefix, { continuationToken });
            objectsToDelete.push(...result.objects.map(obj => obj.Key));
            continuationToken = result.continuationToken;
        } while (continuationToken);

        if (objectsToDelete.length > 0) {
            await deleteObjects(bucket, objectsToDelete);
        }

        // Delete from MongoDB
        await Figure.deleteOne({ figureId });

        return res.status(200).json({ success: true, message: 'Figure deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting figure:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
