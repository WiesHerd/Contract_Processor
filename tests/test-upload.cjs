require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('./src/utils/s3Client.js');

const filePath = path.join(process.cwd(), 'test.txt');
const fileContent = fs.readFileSync(filePath);

uploadFile(fileContent, 'uploads/test.txt')
  .then(data => {
    console.log('File uploaded successfully:', data.Location);
  })
  .catch(err => {
    console.error('Upload error:', err);
  }); 