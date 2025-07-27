// Test script to verify template loading from S3
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Configure S3 client
const s3Client = new S3Client({
  region: 'us-east-2',
  // Use default credential chain
});

const BUCKET = 'contractengine-storage-wherdzik';

async function testTemplateLoading() {
  try {
    console.log('🔍 Testing template loading from S3...');
    console.log('📦 Bucket:', BUCKET);
    
    // List template folders
    console.log('\n📁 Listing template folders...');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'templates/',
      Delimiter: '/'
    });
    
    const result = await s3Client.send(listCommand);
    console.log('✅ Template folders found:', result.CommonPrefixes?.map(p => p.Prefix) || []);
    
    // List template metadata files
    console.log('\n📄 Listing template metadata files...');
    const metadataCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'metadata/templates/'
    });
    
    const metadataResult = await s3Client.send(metadataCommand);
    console.log('✅ Template metadata files found:', metadataResult.Contents?.map(c => c.Key) || []);
    
    // Test specific template folders
    const templateFolders = ['40a4934a-fc1a-4145-860b-7615123f4512', '5fd5c4b1-fa21-43d7-8bfe-49f706a17593', 'f4677c0b-4e85-49ca-8f9d-c58535509d6f'];
    
    for (const folder of templateFolders) {
      console.log(`\n🔍 Checking contents of template folder: ${folder}`);
      const folderCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `templates/${folder}/`
      });
      
      const folderResult = await s3Client.send(folderCommand);
      console.log(`📁 Files in ${folder}:`, folderResult.Contents?.map(c => c.Key) || []);
    }
    
    console.log('\n✅ S3 connectivity test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing template loading:', error);
  }
}

testTemplateLoading(); 