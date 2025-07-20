const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { config } = require('dotenv');

// Load environment variables
config();

const s3Client = new S3Client({
  region: process.env.VITE_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.VITE_S3_BUCKET_NAME || 'contractengine-storage-wherdzik';

async function recreateContractsFolder() {
  console.log('🔧 Recreating contracts folder structure...');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  
  try {
    // Create the main contracts folder structure
    const foldersToCreate = [
      'contracts/',
      'contracts/immutable/',
      'contracts/metadata/'
    ];
    
    console.log('📁 Creating folder structure:');
    foldersToCreate.forEach(folder => {
      console.log(`   - ${folder}`);
    });
    
    // Create each folder by uploading an empty object with a trailing slash
    for (const folder of foldersToCreate) {
      try {
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: folder,
          Body: '', // Empty content
          ContentType: 'application/x-directory'
        });
        
        await s3Client.send(putCommand);
        console.log(`✅ Created folder: ${folder}`);
      } catch (error) {
        if (error.name === 'NoSuchBucket') {
          console.error(`❌ Bucket ${BUCKET_NAME} does not exist!`);
          process.exit(1);
        } else if (error.name === 'AccessDenied') {
          console.error(`❌ Access denied to bucket ${BUCKET_NAME}. Check your AWS credentials.`);
          process.exit(1);
        } else {
          console.log(`⚠️  Folder ${folder} might already exist or there was an issue:`, error.message);
        }
      }
    }
    
    console.log('🎉 Contracts folder structure recreated!');
    console.log('📝 The app should now be able to store contracts properly.');
    
  } catch (error) {
    console.error('❌ Error recreating contracts folder:', error);
    process.exit(1);
  }
}

// Run the recreation
recreateContractsFolder().catch(console.error); 