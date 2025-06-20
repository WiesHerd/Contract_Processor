import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION || import.meta.env.AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || import.meta.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || import.meta.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload a file to S3
 * @param file - File, Buffer, or Blob to upload
 * @param key - S3 object key (e.g., 'uploads/myfile.csv')
 * @returns Promise with S3 upload result
 */
export async function uploadFile(file: Buffer | Blob, key: string) {
  try {
    const bucket = import.meta.env.VITE_S3_BUCKET || import.meta.env.S3_BUCKET;
    const region = import.meta.env.VITE_AWS_REGION || import.meta.env.AWS_REGION;
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
    });

    const response = await s3Client.send(command);
    return {
      success: true,
      location: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
      response,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a pre-signed URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise with pre-signed URL
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  try {
    const bucket = import.meta.env.VITE_S3_BUCKET || import.meta.env.S3_BUCKET;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 