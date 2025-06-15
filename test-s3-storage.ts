require('dotenv').config();
import fs from 'fs';
import path from 'path';
import { 
  uploadFile, 
  getSignedDownloadUrl, 
  deleteFile,
  listFiles,
  generateUniqueKey
} from './src/utils/s3Storage';

async function testS3Storage() {
  try {
    // Create a test file
    const testContent = 'This is a test file for S3 storage verification';
    const testFilePath = path.join(process.cwd(), 'test.txt');
    fs.writeFileSync(testFilePath, testContent);

    // Test file upload
    console.log('Testing file upload...');
    const fileContent = fs.readFileSync(testFilePath);
    const key = `uploads/test-${Date.now()}.txt`;
    await uploadFile(fileContent, key);
    console.log('Upload successful!');

    // Test getting signed URL
    console.log('\nTesting signed URL generation...');
    const signedUrl = await getSignedDownloadUrl(key);
    console.log('Signed URL:', signedUrl);

    // Test listing files
    console.log('\nTesting file listing...');
    const files = await listFiles('uploads/');
    console.log('Files in uploads directory:', files);

    // Test file deletion
    console.log('\nTesting file deletion...');
    await deleteFile(key);
    console.log('File deleted successfully!');

    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testS3Storage(); 