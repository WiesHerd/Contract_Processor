// Verify CORS Configuration Fix
// This script tests if the S3 bucket allows requests from the Amplify app domain

const https = require('https');

const BUCKET_NAME = 'contractengine-storage-wherdzik';
const AMPLIFY_DOMAIN = 'https://production.d1u3c8k7z1pj0k.amplifyapp.com';

console.log('🔍 Testing S3 CORS Configuration...');
console.log(`📦 Bucket: ${BUCKET_NAME}`);
console.log(`🌐 Domain: ${AMPLIFY_DOMAIN}`);

// Test URLs
const testUrls = [
  `https://${BUCKET_NAME}.s3.us-east-2.amazonaws.com/?list-type=2&prefix=templates/`,
  `https://${BUCKET_NAME}.s3.us-east-2.amazonaws.com/?list-type=2&prefix=contracts/`
];

function testCors(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'OPTIONS', // Preflight request
      headers: {
        'Origin': AMPLIFY_DOMAIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`\n📡 Response for ${parsedUrl.pathname}:`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   CORS Headers:`);
      console.log(`     Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
      console.log(`     Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`);
      console.log(`     Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NOT SET'}`);
      
      if (res.statusCode === 200 && res.headers['access-control-allow-origin']) {
        console.log(`   ✅ CORS is properly configured!`);
        resolve(true);
      } else {
        console.log(`   ❌ CORS is not properly configured`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 Running CORS tests...\n');
  
  let allPassed = true;
  
  for (const testUrl of testUrls) {
    const passed = await testCors(testUrl);
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\n📊 Test Results:');
  if (allPassed) {
    console.log('🎉 All CORS tests passed! Your S3 bucket is properly configured.');
    console.log('🔄 Please refresh your Amplify app and try again.');
  } else {
    console.log('❌ Some CORS tests failed. Please follow the manual configuration steps:');
    console.log('   1. Go to AWS S3 Console');
    console.log('   2. Select bucket: contractengine-storage-wherdzik');
    console.log('   3. Go to Permissions > CORS');
    console.log('   4. Apply the CORS configuration from FIX_S3_CORS_GUIDE.md');
  }
}

runTests().catch(console.error); 