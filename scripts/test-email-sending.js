#!/usr/bin/env node

import { SESClient, GetSendQuotaCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration...\n');

  try {
    // Test with default credentials (for CLI testing)
    const client = new SESClient({ region: REGION });
    
    console.log('📧 Checking SES Quota...');
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResult = await client.send(quotaCommand);
    
    console.log('✅ SES Quota Information:');
    console.log(`   - Max 24h Send: ${quotaResult.Max24HourSend}`);
    console.log(`   - Sent Last 24h: ${quotaResult.SentLast24Hours}`);
    console.log(`   - Max Send Rate: ${quotaResult.MaxSendRate}`);
    
    console.log('\n📧 Checking Email Verification...');
    const verificationCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [FROM_EMAIL]
    });
    const verificationResult = await client.send(verificationCommand);
    
    const verificationStatus = verificationResult.VerificationAttributes?.[FROM_EMAIL]?.VerificationStatus;
    console.log(`✅ From Email Status: ${verificationStatus || 'Not Found'}`);
    
    if (verificationStatus === 'Success') {
      console.log('✅ Email domain is verified and ready to send!');
    } else {
      console.log('❌ Email domain is NOT verified. This is why emails are not being sent.');
      console.log('🔧 To fix this:');
      console.log('   1. Go to AWS SES Console');
      console.log('   2. Verify your email domain or use a verified email address');
      console.log('   3. Update the fromEmail in src/services/emailService.ts');
    }
    
  } catch (error) {
    console.error('❌ Error testing email configuration:', error);
    console.log('\n🔧 This suggests SES is not properly configured or accessible.');
  }
}

testEmailConfiguration().catch(console.error); 