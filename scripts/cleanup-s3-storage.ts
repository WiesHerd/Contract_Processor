import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

// Load environment variables
config();

const s3Client = new S3Client({
  region: process.env.VITE_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.VITE_S3_BUCKET_NAME || 'contractengine-storage-wherdzik';

async function cleanupS3Storage() {
  console.log('🔍 Starting S3 storage cleanup...');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  
  try {
    // List all objects in the contracts/ directory (excluding immutable/)
    console.log('📋 Listing objects in contracts/ directory...');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'contracts/',
      MaxKeys: 1000,
    });
    
    const listResult = await s3Client.send(listCommand);
    const objects = listResult.Contents || [];
    
    // Filter out objects in the immutable/ subdirectory
    const corruptedObjects = objects.filter(obj => 
      obj.Key && 
      obj.Key.startsWith('contracts/') && 
      !obj.Key.startsWith('contracts/immutable/') &&
      obj.Size !== undefined && 
      obj.Size <= 100 // Files smaller than 100 bytes are likely corrupted
    );
    
    console.log(`📊 Found ${objects.length} total objects in contracts/`);
    console.log(`🚨 Found ${corruptedObjects.length} corrupted objects to delete`);
    
    if (corruptedObjects.length === 0) {
      console.log('✅ No corrupted objects found. Cleanup complete!');
      return;
    }
    
    // Group objects by their folder path for deletion
    const foldersToDelete = new Set<string>();
    corruptedObjects.forEach(obj => {
      if (obj.Key) {
        // Extract folder path (everything before the last /)
        const folderPath = obj.Key.substring(0, obj.Key.lastIndexOf('/') + 1);
        foldersToDelete.add(folderPath);
      }
    });
    
    console.log(`🗂️  Found ${foldersToDelete.size} corrupted folders to delete:`);
    Array.from(foldersToDelete).forEach(folder => {
      console.log(`   - ${folder}`);
    });
    
    // Delete all objects in corrupted folders
    const objectsToDelete = corruptedObjects.map(obj => ({ Key: obj.Key! }));
    
    console.log('🗑️  Deleting corrupted objects...');
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    });
    
    const deleteResult = await s3Client.send(deleteCommand);
    
    console.log(`✅ Successfully deleted ${deleteResult.Deleted?.length || 0} objects`);
    
    if (deleteResult.Errors && deleteResult.Errors.length > 0) {
      console.log(`❌ Failed to delete ${deleteResult.Errors.length} objects:`);
      deleteResult.Errors.forEach(error => {
        console.log(`   - ${error.Key}: ${error.Message}`);
      });
    }
    
    console.log('🎉 S3 storage cleanup completed!');
    console.log('📝 Next steps:');
    console.log('   1. Update code to use only contracts/immutable/ storage');
    console.log('   2. Test contract generation to ensure it works correctly');
    
  } catch (error) {
    console.error('❌ Error during S3 cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupS3Storage().catch(console.error); 