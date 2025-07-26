const AWS = require('aws-sdk');

// Configure AWS with the credentials from your .env file
AWS.config.update({
  region: 'us-east-2',
  accessKeyId: 'AKIAWIJIU2070PWU7Q6R',
  secretAccessKey: 'tNRdTOr26wCRJQSz6g4TI2BXoz4qH3xg1Oq5WwcS'
});

async function testCredentials() {
  try {
    console.log('Testing AWS credentials...');
    
    // Test 1: Get caller identity
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log('✅ Caller identity:', identity);
    
    // Test 2: List S3 buckets
    const s3 = new AWS.S3();
    const buckets = await s3.listBuckets().promise();
    console.log('✅ S3 buckets:', buckets.Buckets.map(b => b.Name));
    
    // Test 3: Try to access the specific bucket
    const bucketName = 'contractengine-storage-wherdzik';
    try {
      const objects = await s3.listObjectsV2({ Bucket: bucketName, MaxKeys: 1 }).promise();
      console.log('✅ Can access bucket:', bucketName);
    } catch (error) {
      console.log('❌ Cannot access bucket:', bucketName, error.message);
    }
    
  } catch (error) {
    console.log('❌ Credential test failed:', error.message);
  }
}

testCredentials(); 