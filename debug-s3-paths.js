// Debug script to find templates in S3
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Configure S3 client
const s3Client = new S3Client({
  region: 'us-east-2',
  // Use default credential chain
});

const BUCKET = 'contractengine-storage-wherdzik';

async function debugS3Paths() {
  try {
    console.log('🔍 Debugging S3 paths to find templates...');
    console.log('📦 Bucket:', BUCKET);
    
    // Test different possible paths
    const pathsToTest = [
      'templates/',
      'metadata/templates/',
      'template/',
      'templates',
      'template',
      'documents/',
      'docs/',
      'files/',
      'data/',
      'content/',
      'assets/',
      'uploads/',
      'storage/',
      'public/',
      'private/',
      'user-files/',
      'amplify/',
      'app/',
      'web/',
      'site/',
      'static/',
      'media/',
      'resources/',
      'materials/',
      'forms/',
      'contracts/',
      'schedules/',
      'addendums/',
      'legal/',
      'documents/templates/',
      'documents/schedules/',
      'documents/contracts/',
      'documents/addendums/',
      'documents/legal/',
      'contracts/templates/',
      'contracts/schedules/',
      'contracts/addendums/',
      'contracts/legal/',
      'schedules/templates/',
      'schedules/contracts/',
      'schedules/addendums/',
      'schedules/legal/',
      'addendums/templates/',
      'addendums/contracts/',
      'addendums/schedules/',
      'addendums/legal/',
      'legal/templates/',
      'legal/contracts/',
      'legal/schedules/',
      'legal/addendums/',
      'user-files/templates/',
      'user-files/contracts/',
      'user-files/schedules/',
      'user-files/addendums/',
      'user-files/legal/',
      'public/templates/',
      'public/contracts/',
      'public/schedules/',
      'public/addendums/',
      'public/legal/',
      'private/templates/',
      'private/contracts/',
      'private/schedules/',
      'private/addendums/',
      'private/legal/',
      'amplify/templates/',
      'amplify/contracts/',
      'amplify/schedules/',
      'amplify/addendums/',
      'amplify/legal/',
      'app/templates/',
      'app/contracts/',
      'app/schedules/',
      'app/addendums/',
      'app/legal/',
      'web/templates/',
      'web/contracts/',
      'web/schedules/',
      'web/addendums/',
      'web/legal/',
      'site/templates/',
      'site/contracts/',
      'site/schedules/',
      'site/addendums/',
      'site/legal/',
      'static/templates/',
      'static/contracts/',
      'static/schedules/',
      'static/addendums/',
      'static/legal/',
      'media/templates/',
      'media/contracts/',
      'media/schedules/',
      'media/addendums/',
      'media/legal/',
      'resources/templates/',
      'resources/contracts/',
      'resources/schedules/',
      'resources/addendums/',
      'resources/legal/',
      'materials/templates/',
      'materials/contracts/',
      'materials/schedules/',
      'materials/addendums/',
      'materials/legal/',
      'forms/templates/',
      'forms/contracts/',
      'forms/schedules/',
      'forms/addendums/',
      'forms/legal/',
      'uploads/templates/',
      'uploads/contracts/',
      'uploads/schedules/',
      'uploads/addendums/',
      'uploads/legal/',
      'storage/templates/',
      'storage/contracts/',
      'storage/schedules/',
      'storage/addendums/',
      'storage/legal/',
      'data/templates/',
      'data/contracts/',
      'data/schedules/',
      'data/addendums/',
      'data/legal/',
      'content/templates/',
      'content/contracts/',
      'content/schedules/',
      'content/addendums/',
      'content/legal/',
      'assets/templates/',
      'assets/contracts/',
      'assets/schedules/',
      'assets/addendums/',
      'assets/legal/',
    ];
    
    const results = [];
    
    for (const path of pathsToTest) {
      try {
        console.log(`🔍 Testing path: ${path}`);
        const command = new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: path,
          MaxKeys: 10, // Limit results for faster testing
        });
        
        const result = await s3Client.send(command);
        const count = result.Contents?.length || 0;
        
        if (count > 0) {
          console.log(`✅ Found ${count} items in ${path}`);
          const sampleFiles = result.Contents?.slice(0, 3).map(c => c.Key) || [];
          console.log(`📁 Sample files:`, sampleFiles);
          results.push({ path, count, sampleFiles });
        } else {
          console.log(`❌ No items found in ${path}`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${path}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary of paths with content:');
    results.forEach(r => {
      console.log(`✅ ${r.path}: ${r.count} items`);
      console.log(`   Sample: ${r.sampleFiles.join(', ')}`);
    });
    
    // Also try listing the root to see what's available
    console.log('\n🔍 Listing root directory...');
    const rootCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 20,
    });
    
    const rootResult = await s3Client.send(rootCommand);
    console.log('📁 Root directory contents:');
    rootResult.Contents?.forEach(item => {
      console.log(`   ${item.Key}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging S3 paths:', error);
  }
}

debugS3Paths(); 