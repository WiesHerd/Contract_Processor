import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { uploadFile, getSignedDownloadUrl } from './src/utils/s3Client';

async function testUpload() {
  try {
    const filePath = path.join(process.cwd(), 'test.txt');
    const fileContent = fs.readFileSync(filePath);
    const key = `uploads/test-${Date.now()}.txt`;

    console.log('Uploading file...');
    const uploadResult = await uploadFile(fileContent, key);
    console.log('Upload successful:', uploadResult);

    console.log('\nGenerating signed URL...');
    const signedUrl = await getSignedDownloadUrl(key);
    console.log('Signed URL:', signedUrl);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testUpload(); 
