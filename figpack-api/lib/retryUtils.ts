/**
 * Utility functions for retrying database operations with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Default retry condition - retries on network errors and connection issues
 */
function defaultRetryCondition(error: any): boolean {
  if (!error) return false;
  
  // MongoDB network errors
  if (error.name === 'MongoNetworkError') return true;
  if (error.name === 'MongoServerSelectionError') return true;
  if (error.name === 'MongoTimeoutError') return true;
  
  // Connection reset errors
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ENOTFOUND') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;
  
  // MongoDB specific error codes that are retryable
  if (error.code === 11000) return false; // Duplicate key error - don't retry
  if (error.code === 16500) return true; // Sharding error
  if (error.code === 189) return true; // Primary stepped down
  if (error.code === 91) return true; // Shutdown in progress
  
  // Check for retryable write/read errors
  if (error.errorLabels && error.errorLabels.includes('RetryableWriteError')) return true;
  if (error.errorLabels && error.errorLabels.includes('RetryableReadError')) return true;
  
  return false;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = defaultRetryCondition
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if this error should be retried
      if (!retryCondition(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
      const delay = exponentialDelay + jitter;
      
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        name: (error as any)?.name
      });
      
      await sleep(delay);
    }
  }
  
  // If we get here, all retries failed
  console.error(`Database operation failed after ${maxRetries + 1} attempts:`, lastError);
  throw lastError;
}

/**
 * Check if the MongoDB connection is healthy
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return false;
    }
    
    // Perform a simple ping operation
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.warn('Connection health check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Wrapper for database operations that includes connection health check and retry logic
 */
export async function withDatabaseResilience<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryDatabaseOperation(async () => {
    // Check connection health before attempting operation
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      // Force reconnection by clearing the cached connection
      const connectDB = require('./db').default;
      const globalWithMongoose = global as any;
      if (globalWithMongoose.mongoose) {
        globalWithMongoose.mongoose.conn = null;
        globalWithMongoose.mongoose.promise = null;
      }
      
      // Reconnect
      await connectDB();
    }
    
    return await operation();
  }, options);
}
