import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: 'us-east-2', // Based on your S3 console URL
});

const BUCKET_NAME = 'contractengine-storage-wherdzik';
const CONTRACTS_PREFIX = 'contracts/immutable/';

async function clearS3Contracts() {
  try {
    console.log('🔍 Scanning S3 for contract files...');
    
    // List all objects in the contracts folder
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: CONTRACTS_PREFIX,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('✅ No contract files found in S3');
      return;
    }
    
    console.log(`📁 Found ${listResponse.Contents.length} objects in S3 contracts folder`);
    
    // Group objects by their key prefix (folder structure)
    const folders = new Set();
    listResponse.Contents.forEach(obj => {
      const key = obj.Key;
      const folderPath = key.split('/').slice(0, -1).join('/') + '/';
      folders.add(folderPath);
    });
    
    console.log(`📂 Found ${folders.size} contract folders:`);
    folders.forEach(folder => {
      console.log(`   - ${folder}`);
    });
    
    // Delete all objects
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
        Quiet: false
      }
    });
    
    console.log('🗑️  Deleting all contract files from S3...');
    const deleteResponse = await s3Client.send(deleteCommand);
    
    if (deleteResponse.Deleted) {
      console.log(`✅ Successfully deleted ${deleteResponse.Deleted.length} files from S3`);
    }
    
    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.log('⚠️  Some files could not be deleted:');
      deleteResponse.Errors.forEach(error => {
        console.log(`   - ${error.Key}: ${error.Message}`);
      });
    }
    
    console.log('🎉 S3 cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error clearing S3 contracts:', error);
    throw error;
  }
}

// Run the cleanup
clearS3Contracts()
  .then(() => {
    console.log('✅ S3 cleanup finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ S3 cleanup failed:', error);
    process.exit(1);
  }); 