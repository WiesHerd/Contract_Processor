import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: 'us-east-2',
});

const BUCKET_NAME = 'contractengine-storage-wherdzik';
const CONTRACTS_PREFIX = 'contracts/immutable/';

async function cleanupOrphanedS3Contracts() {
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
    
    // Analyze each file to determine if it's orphaned
    const orphanedFiles = [];
    const validFiles = [];
    
    for (const obj of listResponse.Contents) {
      const key = obj.Key;
      console.log(`🔍 Analyzing: ${key}`);
      
      try {
        // Check if this is a valid contract file by examining its structure
        const pathParts = key.split('/');
        
        // Valid structure should be: contracts/immutable/{contractId}/{filename}
        if (pathParts.length >= 4) {
          const contractId = pathParts[2];
          const filename = pathParts[3];
          
          // Check if contractId follows the expected format: {providerId}-{templateId}-{contractYear}
          const contractIdParts = contractId.split('-');
          
          if (contractIdParts.length >= 3) {
            // This looks like a valid contract ID format
            console.log(`✅ Valid contract file: ${key}`);
            validFiles.push(key);
          } else {
            console.log(`❌ Orphaned file (invalid contract ID format): ${key}`);
            orphanedFiles.push(key);
          }
        } else {
          console.log(`❌ Orphaned file (invalid path structure): ${key}`);
          orphanedFiles.push(key);
        }
        
        // Additional check: try to get metadata to see if it's a valid contract
        try {
          const headCommand = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          });
          
          const headResponse = await s3Client.send(headCommand);
          const metadata = headResponse.Metadata || {};
          
          // Check if it has expected metadata
          if (metadata['contract-id'] || metadata['generated-at']) {
            console.log(`✅ File has valid metadata: ${key}`);
          } else {
            console.log(`⚠️ File missing expected metadata: ${key}`);
            // Don't mark as orphaned just for missing metadata, but log it
          }
        } catch (headError) {
          console.log(`⚠️ Could not read metadata for: ${key}`);
        }
        
      } catch (error) {
        console.log(`❌ Error analyzing file ${key}:`, error);
        orphanedFiles.push(key);
      }
    }
    
    console.log('\n📊 Analysis Results:');
    console.log(`✅ Valid files: ${validFiles.length}`);
    console.log(`❌ Orphaned files: ${orphanedFiles.length}`);
    
    if (orphanedFiles.length > 0) {
      console.log('\n🗑️ Orphaned files to delete:');
      orphanedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      
      // Ask for confirmation
      console.log('\n⚠️ Do you want to delete these orphaned files? (y/N)');
      // In a real script, you'd read from stdin
      // For now, we'll just log what would be deleted
      
      console.log('\n🔧 To actually delete these files, run:');
      console.log('node scripts/delete-orphaned-files.js');
      
      // Create a separate script for actual deletion
      const deleteScript = `
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'us-east-2',
});

const BUCKET_NAME = 'contractengine-storage-wherdzik';

const orphanedFiles = ${JSON.stringify(orphanedFiles, null, 2)};

async function deleteOrphanedFiles() {
  try {
    console.log('🗑️ Deleting ${orphanedFiles.length} orphaned files...');
    
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: orphanedFiles.map(key => ({ Key: key })),
        Quiet: false
      }
    });
    
    const deleteResponse = await s3Client.send(deleteCommand);
    
    if (deleteResponse.Deleted) {
      console.log(\`✅ Successfully deleted \${deleteResponse.Deleted.length} files\`);
    }
    
    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.log('❌ Errors during deletion:');
      deleteResponse.Errors.forEach(error => {
        console.log(\`   - \${error.Key}: \${error.Message}\`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting orphaned files:', error);
  }
}

deleteOrphanedFiles();
`;
      
      // Write the delete script to a file
      const fs = await import('fs');
      fs.writeFileSync('scripts/delete-orphaned-files.js', deleteScript);
      console.log('📝 Created delete script: scripts/delete-orphaned-files.js');
      
    } else {
      console.log('✅ No orphaned files found!');
    }
    
  } catch (error) {
    console.error('❌ Error scanning S3:', error);
  }
}

cleanupOrphanedS3Contracts(); 