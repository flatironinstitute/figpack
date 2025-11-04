import { Env, Bucket, AuthResult, RateLimitResult } from "../types";
import { json } from "../utils";
import { authenticateAdmin } from "../auth";

// Helper function to parse JSON fields from database
function parseBucket(row: any): Bucket {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as 'cloudflare' | 'aws',
    description: row.description,
    bucketBaseUrl: row.bucket_base_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    awsAccessKeyId: row.aws_access_key_id,
    awsSecretAccessKey: row.aws_secret_access_key,
    s3Endpoint: row.s3_endpoint,
    isPublic: Boolean(row.is_public),
    authorizedUsers: JSON.parse(row.authorized_users || '[]'),
  };
}

// Helper function to sanitize bucket data (remove secret key from responses)
function sanitizeBucket(bucket: Bucket): Bucket {
  return {
    ...bucket,
    awsSecretAccessKey: "***HIDDEN***",
  };
}

export async function handleGetBuckets(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    // Extract API key
    const apiKey = request.headers.get("x-api-key");
    
    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate (admin only)
    const authResult = await authenticateAdmin(apiKey, env);
    
    if (!authResult.isValid || !authResult.isAdmin) {
      return json({ success: false, message: "Admin access required" }, 401);
    }

    // Get all buckets
    const result = await env.figpack_db
      .prepare("SELECT * FROM buckets ORDER BY created_at DESC")
      .all();

    const buckets = result.results.map(parseBucket).map(sanitizeBucket);

    return json({
      success: true,
      buckets,
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Error getting buckets:", error);
    return json({ success: false, message: "Failed to get buckets" }, 500);
  }
}

export async function handleCreateBucket(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    // Extract API key
    const apiKey = request.headers.get("x-api-key");
    
    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate (admin only)
    const authResult = await authenticateAdmin(apiKey, env);
    
    if (!authResult.isValid || !authResult.isAdmin) {
      return json({ success: false, message: "Admin access required" }, 401);
    }

    // Parse request body
    const body = await request.json() as any;
    const bucketData = body.bucket;

    if (!bucketData) {
      return json({ success: false, message: "Bucket data is required" }, 400);
    }

    // Validate required fields
    const {
      name,
      provider,
      description,
      bucketBaseUrl,
      credentials,
      authorization,
    } = bucketData;

    if (!name || !provider || !description || !bucketBaseUrl || !credentials) {
      return json({
        success: false,
        message: "Name, provider, description, bucketBaseUrl, and credentials are required",
      }, 400);
    }

    // Validate authorization fields
    if (authorization && typeof authorization.isPublic !== "boolean") {
      return json({
        success: false,
        message: "Authorization isPublic field must be a boolean",
      }, 400);
    }

    if (
      authorization &&
      authorization.authorizedUsers &&
      !Array.isArray(authorization.authorizedUsers)
    ) {
      return json({
        success: false,
        message: "Authorization authorizedUsers field must be an array",
      }, 400);
    }

    if (
      !credentials.AWS_ACCESS_KEY_ID ||
      !credentials.AWS_SECRET_ACCESS_KEY ||
      !credentials.S3_ENDPOINT
    ) {
      return json({
        success: false,
        message: "All credential fields (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT) are required",
      }, 400);
    }

    // Check if bucket already exists
    const existing = await env.figpack_db
      .prepare("SELECT id FROM buckets WHERE name = ?")
      .bind(name)
      .first();

    if (existing) {
      return json({
        success: false,
        message: "Bucket with this name already exists",
      }, 409);
    }

    // Create the bucket
    const now = Date.now();
    const isPublic = authorization?.isPublic || false;
    const authorizedUsers = JSON.stringify(authorization?.authorizedUsers || []);

    const result = await env.figpack_db
      .prepare(`
        INSERT INTO buckets (
          name, provider, description, bucket_base_url,
          aws_access_key_id, aws_secret_access_key, s3_endpoint,
          is_public, authorized_users,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        name,
        provider,
        description,
        bucketBaseUrl,
        credentials.AWS_ACCESS_KEY_ID,
        credentials.AWS_SECRET_ACCESS_KEY,
        credentials.S3_ENDPOINT,
        isPublic ? 1 : 0,
        authorizedUsers,
        now,
        now
      )
      .run();

    // Fetch the created bucket
    const newBucket = await env.figpack_db
      .prepare("SELECT * FROM buckets WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first();

    const bucket = sanitizeBucket(parseBucket(newBucket));

    return json({
      success: true,
      message: "Bucket created successfully",
      bucket,
    }, 201, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Error creating bucket:", error);
    return json({ success: false, message: "Failed to create bucket" }, 500);
  }
}

export async function handleUpdateBucket(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    // Extract API key
    const apiKey = request.headers.get("x-api-key");
    
    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate (admin only)
    const authResult = await authenticateAdmin(apiKey, env);
    
    if (!authResult.isValid || !authResult.isAdmin) {
      return json({ success: false, message: "Admin access required" }, 401);
    }

    // Parse request body
    const body = await request.json() as any;
    const { name, bucket: bucketData } = body;

    if (!name || !bucketData) {
      return json({
        success: false,
        message: "Bucket name and data are required",
      }, 400);
    }

    // Check if bucket exists
    const existing = await env.figpack_db
      .prepare("SELECT * FROM buckets WHERE name = ?")
      .bind(name)
      .first();

    if (!existing) {
      return json({ success: false, message: "Bucket not found" }, 404);
    }

    const existingBucket = parseBucket(existing);

    // Build update fields
    const updates: string[] = [];
    const values: any[] = [];

    if (bucketData.description !== undefined) {
      updates.push("description = ?");
      values.push(bucketData.description);
    }

    if (bucketData.provider !== undefined) {
      updates.push("provider = ?");
      values.push(bucketData.provider);
    }

    if (bucketData.bucketBaseUrl !== undefined) {
      updates.push("bucket_base_url = ?");
      values.push(bucketData.bucketBaseUrl);
    }

    // Update credentials if provided
    if (bucketData.credentials) {
      if (bucketData.credentials.AWS_ACCESS_KEY_ID) {
        updates.push("aws_access_key_id = ?");
        values.push(bucketData.credentials.AWS_ACCESS_KEY_ID);
      }
      if (bucketData.credentials.AWS_SECRET_ACCESS_KEY) {
        updates.push("aws_secret_access_key = ?");
        values.push(bucketData.credentials.AWS_SECRET_ACCESS_KEY);
      }
      if (bucketData.credentials.S3_ENDPOINT) {
        updates.push("s3_endpoint = ?");
        values.push(bucketData.credentials.S3_ENDPOINT);
      }
    }

    // Update authorization if provided
    if (bucketData.authorization !== undefined) {
      if (bucketData.authorization.isPublic !== undefined) {
        updates.push("is_public = ?");
        values.push(bucketData.authorization.isPublic ? 1 : 0);
      }
      if (bucketData.authorization.authorizedUsers !== undefined) {
        updates.push("authorized_users = ?");
        values.push(JSON.stringify(bucketData.authorization.authorizedUsers));
      }
    }

    // Update timestamp
    updates.push("updated_at = ?");
    values.push(Date.now());

    // Add name to values for WHERE clause
    values.push(name);

    // Execute update
    await env.figpack_db
      .prepare(`UPDATE buckets SET ${updates.join(", ")} WHERE name = ?`)
      .bind(...values)
      .run();

    // Fetch updated bucket
    const updated = await env.figpack_db
      .prepare("SELECT * FROM buckets WHERE name = ?")
      .bind(name)
      .first();

    const bucket = sanitizeBucket(parseBucket(updated));

    return json({
      success: true,
      message: "Bucket updated successfully",
      bucket,
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Error updating bucket:", error);
    return json({ success: false, message: "Failed to update bucket" }, 500);
  }
}

export async function handleDeleteBucket(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    // Extract API key
    const apiKey = request.headers.get("x-api-key");
    
    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate (admin only)
    const authResult = await authenticateAdmin(apiKey, env);
    
    if (!authResult.isValid || !authResult.isAdmin) {
      return json({ success: false, message: "Admin access required" }, 401);
    }

    // Parse request body
    const body = await request.json() as any;
    const { name } = body;

    if (!name) {
      return json({ success: false, message: "Bucket name is required" }, 400);
    }

    // Check if bucket exists
    const existing = await env.figpack_db
      .prepare("SELECT id FROM buckets WHERE name = ?")
      .bind(name)
      .first();

    if (!existing) {
      return json({ success: false, message: "Bucket not found" }, 404);
    }

    // Delete the bucket
    await env.figpack_db
      .prepare("DELETE FROM buckets WHERE name = ?")
      .bind(name)
      .run();

    return json({
      success: true,
      message: "Bucket deleted successfully",
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return json({ success: false, message: "Failed to delete bucket" }, 500);
  }
}
