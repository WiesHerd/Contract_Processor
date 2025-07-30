import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: 'us-east-2',
});

const BUCKET_NAME = 'contractengine-storage-wherdzik';
const CONTRACTS_PREFIX = 'contracts/immutable/';

async function checkS3Contracts() {
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
    
    console.log(`📁 Found ${listResponse.Contents.length} objects in S3 contracts folder\n`);
    
    // Analyze each file
    for (const obj of listResponse.Contents) {
      const key = obj.Key;
      const size = obj.Size;
      const lastModified = obj.LastModified;
      
      console.log(`📄 File: ${key}`);
      console.log(`   Size: ${size} bytes`);
      console.log(`   Last Modified: ${lastModified}`);
      
      try {
        // Get metadata
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        
        const headResponse = await s3Client.send(headCommand);
        const metadata = headResponse.Metadata || {};
        
        console.log(`   Metadata:`);
        Object.entries(metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
        
        // Check if this looks like a valid contract
        const pathParts = key.split('/');
        if (pathParts.length >= 4) {
          const contractId = pathParts[2];
          const contractIdParts = contractId.split('-');
          
          if (contractIdParts.length >= 3) {
            console.log(`   ✅ Valid contract ID format`);
          } else {
            console.log(`   ❌ Invalid contract ID format`);
          }
        } else {
          console.log(`   ❌ Invalid path structure`);
        }
        
      } catch (headError) {
        console.log(`   ⚠️ Could not read metadata: ${headError.message}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('📊 Summary:');
    console.log(`Total files: ${listResponse.Contents.length}`);
    
    // Count by folder structure
    const folderCounts = {};
    listResponse.Contents.forEach(obj => {
      const pathParts = obj.Key.split('/');
      const folder = pathParts.slice(0, -1).join('/');
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    });
    
    console.log('\n📂 Files by folder:');
    Object.entries(folderCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: ${count} files`);
    });
    
  } catch (error) {
    console.error('❌ Error scanning S3:', error);
  }
}

checkS3Contracts(); 