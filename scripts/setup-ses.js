#!/usr/bin/env node

/**
 * SES Setup Script for ContractEngine
 * 
 * This script helps configure Amazon SES for sending welcome emails
 * and password reset emails in the ContractEngine application.
 */

const { SESClient, GetSendQuotaCommand, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses');

// Configuration
const REGION = 'us-east-2'; // Update this to your SES region
const FROM_EMAIL = 'noreply@contractengine.com'; // Update this to your verified email

async function checkSESConfiguration() {
  console.log('🔍 Checking SES Configuration...\n');
  
  try {
    const client = new SESClient({ region: REGION });
    
    // Check sending quota
    console.log('📊 Checking sending quota...');
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResult = await client.send(quotaCommand);
    
    console.log(`✅ Sending Quota:`);
    console.log(`   - Max 24h send: ${quotaResult.Max24HourSend}`);
    console.log(`   - Sent last 24h: ${quotaResult.SentLast24Hours}`);
    console.log(`   - Max send rate: ${quotaResult.MaxSendRate} per second\n`);
    
    // Check if from email is verified
    console.log('📧 Checking email verification...');
    const verificationCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [FROM_EMAIL],
    });
    const verificationResult = await client.send(verificationCommand);
    
    const verificationStatus = verificationResult.VerificationAttributes?.[FROM_EMAIL]?.VerificationStatus;
    
    if (verificationStatus === 'Success') {
      console.log(`✅ Email ${FROM_EMAIL} is verified`);
    } else {
      console.log(`❌ Email ${FROM_EMAIL} is not verified`);
      console.log(`   Status: ${verificationStatus || 'Not found'}`);
    }
    
    return {
      isConfigured: true,
      isVerified: verificationStatus === 'Success',
      sendingQuota: quotaResult.Max24HourSend,
      sentToday: quotaResult.SentLast24Hours,
    };
    
  } catch (error) {
    console.error('❌ Error checking SES configuration:', error.message);
    return {
      isConfigured: false,
      isVerified: false,
      sendingQuota: 0,
      sentToday: 0,
      error: error.message,
    };
  }
}

async function verifyEmailAddress(email) {
  console.log(`📧 Verifying email address: ${email}\n`);
  
  try {
    const client = new SESClient({ region: REGION });
    
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });
    
    await client.send(command);
    console.log(`✅ Verification email sent to: ${email}`);
    console.log(`📧 Please check your email and click the verification link\n`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error verifying email address:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 SES Setup for ContractEngine\n');
  console.log('This script will help you configure Amazon SES for email sending.\n');
  
  // Check current configuration
  const config = await checkSESConfiguration();
  
  console.log('\n📋 Current Configuration:');
  console.log(`   - Region: ${REGION}`);
  console.log(`   - From Email: ${FROM_EMAIL}`);
  console.log(`   - Configured: ${config.isConfigured ? '✅' : '❌'}`);
  console.log(`   - Verified: ${config.isVerified ? '✅' : '❌'}`);
  console.log(`   - Quota: ${config.sentToday}/${config.sendingQuota} emails today\n`);
  
  if (!config.isVerified) {
    console.log('⚠️  Your from email is not verified. This is required for sending emails.\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Would you like to verify your email address now? (y/n): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await verifyEmailAddress(FROM_EMAIL);
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. If your email is not verified, check your inbox and click the verification link');
  console.log('2. Update the FROM_EMAIL constant in this script with your verified email');
  console.log('3. Update the email configuration in src/services/emailService.ts');
  console.log('4. Test user creation in the admin panel');
  console.log('5. Check the SES console for sending statistics\n');
  
  console.log('🔗 Useful Links:');
  console.log(`   - SES Console: https://console.aws.amazon.com/ses/`);
  console.log(`   - Verified Identities: https://console.aws.amazon.com/ses/v2/home?region=${REGION}#/verified-identities`);
  console.log(`   - Sending Statistics: https://console.aws.amazon.com/ses/v2/home?region=${REGION}#/sending-statistics\n`);
  
  console.log('✅ Setup complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkSESConfiguration, verifyEmailAddress }; 