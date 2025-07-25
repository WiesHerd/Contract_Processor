const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.VITE_S3_BUCKET;

async function cleanupS3Contracts() {
  try {
    console.log('🧹 Starting S3 contracts cleanup...');
    console.log(`📦 Bucket: ${BUCKET}`);
    console.log(`🔍 Searching for contracts in: contracts/immutable/`);
    
    let totalDeleted = 0;
    let continuationToken = undefined;
    
    do {
      // List all objects in the contracts/immutable/ prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'contracts/immutable/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // Process in batches
      });
      
      const response = await s3Client.send(listCommand);
      const objects = response.Contents || [];
      
      console.log(`📄 Found ${objects.length} objects in this batch`);
      
      if (objects.length > 0) {
        // Delete objects in parallel (with some concurrency control)
        const deletePromises = objects.map(async (obj) => {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET,
              Key: obj.Key,
            });
            await s3Client.send(deleteCommand);
            console.log(`✅ Deleted: ${obj.Key}`);
            return true;
          } catch (error) {
            console.error(`❌ Failed to delete ${obj.Key}:`, error.message);
            return false;
          }
        });
        
        // Wait for all deletions to complete
        const results = await Promise.all(deletePromises);
        const successfulDeletions = results.filter(Boolean).length;
        totalDeleted += successfulDeletions;
        
        console.log(`✅ Batch completed: ${successfulDeletions}/${objects.length} objects deleted`);
      }
      
      continuationToken = response.NextContinuationToken;
      
      // Small delay to avoid overwhelming S3
      if (continuationToken) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } while (continuationToken);
    
    console.log(`🎉 Cleanup completed! Total objects deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('❌ Error during S3 cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupS3Contracts(); 