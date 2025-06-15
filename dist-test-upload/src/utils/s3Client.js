import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// Initialize the S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * Upload a file to S3
 * @param file - File, Buffer, or Blob to upload
 * @param key - S3 object key (e.g., 'uploads/myfile.csv')
 * @returns Promise with S3 upload result
 */
export async function uploadFile(file, key) {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: file,
        });
        const response = await s3Client.send(command);
        return {
            success: true,
            location: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            response,
        };
    }
    catch (error) {
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
export async function getSignedDownloadUrl(key, expiresIn = 3600) {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
