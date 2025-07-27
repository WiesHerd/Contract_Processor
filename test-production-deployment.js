// Test script to verify production deployment
import fetch from 'node-fetch';

async function testProductionDeployment() {
  try {
    console.log('🔍 Testing production deployment...');
    
    // Test the main application
    const appUrl = 'https://production.d1u3c8k7z1pj0k.amplifyapp.com/';
    console.log('📱 Testing main app:', appUrl);
    
    const response = await fetch(appUrl);
    console.log('✅ App response status:', response.status);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check if our deployment comment is present
      if (html.includes('Template loading fix deployment')) {
        console.log('✅ Deployment comment found in HTML');
      } else {
        console.log('❌ Deployment comment NOT found in HTML');
      }
      
      // Check if the main JS file is accessible
      const jsMatch = html.match(/src="([^"]*index-[^"]*\.js)"/);
      if (jsMatch) {
        const jsUrl = new URL(jsMatch[1], appUrl).href;
        console.log('📄 Testing JS file:', jsUrl);
        
        const jsResponse = await fetch(jsUrl);
        if (jsResponse.ok) {
          const jsContent = await jsResponse.text();
          
          // Check for our debug messages
          if (jsContent.includes('Starting template hydration from S3')) {
            console.log('✅ Template loading debug code found in JS');
          } else {
            console.log('❌ Template loading debug code NOT found in JS');
          }
          
          if (jsContent.includes('debugS3Contents')) {
            console.log('✅ S3 debug function found in JS');
          } else {
            console.log('❌ S3 debug function NOT found in JS');
          }
        } else {
          console.log('❌ JS file not accessible:', jsResponse.status);
        }
      }
    } else {
      console.log('❌ App not accessible:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing production:', error.message);
  }
}

testProductionDeployment(); 