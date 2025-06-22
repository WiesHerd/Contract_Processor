/**
 * Shared retry utility for AWS operations
 * Consolidates retry logic from s3Storage.ts and awsServices.ts
 */

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
};

// Retryable error types
const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ProvisionedThroughputExceededException',
  'RequestLimitExceeded',
  'ServiceUnavailable',
  'InternalServerError',
  'RequestTimeout',
  'NetworkingError',
];

/**
 * Utility function for retrying operations with exponential backoff
 * @param operation - The async operation to retry
 * @param retries - Number of retries remaining (default: RETRY_CONFIG.maxRetries)
 * @returns Promise<T> - Result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>, 
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

/**
 * Determines if an error is retryable based on error type
 * @param error - The error to check
 * @returns boolean - True if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  return RETRYABLE_ERRORS.some(errType => 
    error.name?.includes(errType) || error.message?.includes(errType)
  );
}

/**
 * Custom AWS error class for better error handling
 */
export class AWSError extends Error {
  constructor(
    message: string,
    public name: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = name;
  }
} 