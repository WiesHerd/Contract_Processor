#!/usr/bin/env node

import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function checkCognitoEmailConfig() {
  console.log('🔍 Checking Cognito User Pool Email Configuration...\n');

  try {
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    const describeCommand = new DescribeUserPoolCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const result = await client.send(describeCommand);
    const userPool = result.UserPool;
    
    console.log('📋 User Pool Configuration:');
    console.log(`   - Name: ${userPool.Name}`);
    console.log(`   - ID: ${userPool.Id}`);
    console.log(`   - Status: ${userPool.Status}`);
    
    console.log('\n📧 Email Configuration:');
    console.log(`   - Email Configuration: ${userPool.EmailConfiguration ? 'Configured' : 'NOT CONFIGURED'}`);
    
    if (userPool.EmailConfiguration) {
      console.log(`   - From Email: ${userPool.EmailConfiguration.From}`);
      console.log(`   - Reply To Email: ${userPool.EmailConfiguration.ReplyToEmailAddress}`);
      console.log(`   - Source ARN: ${userPool.EmailConfiguration.SourceArn}`);
    }
    
    console.log('\n📧 Message Templates:');
    console.log(`   - Invite Message: ${userPool.AdminCreateUserConfig?.InviteMessageTemplate?.Message || 'Default'}`);
    console.log(`   - Invite Subject: ${userPool.AdminCreateUserConfig?.InviteMessageTemplate?.EmailSubject || 'Default'}`);
    
    console.log('\n🔧 Email Verification:');
    console.log(`   - Email Verification Required: ${userPool.EmailVerificationMessage?.EmailMessage || 'Not configured'}`);
    console.log(`   - Email Verification Subject: ${userPool.EmailVerificationMessage?.EmailSubject || 'Not configured'}`);
    
    if (!userPool.EmailConfiguration) {
      console.log('\n❌ PROBLEM: Email is not configured in Cognito User Pool!');
      console.log('🔧 Solution: Configure email in AWS Cognito Console');
      console.log('   1. Go to AWS Cognito Console');
      console.log('   2. Select your User Pool');
      console.log('   3. Go to Messaging tab');
      console.log('   4. Configure email settings');
    } else {
      console.log('\n✅ Email is configured in Cognito User Pool');
      console.log('💡 If emails are not received, check:');
      console.log('   1. Spam/junk folder');
      console.log('   2. Email address verification');
      console.log('   3. SES sending limits');
    }
    
  } catch (error) {
    console.error('❌ Error checking Cognito configuration:', error);
    
    if (error.name === 'NotAuthorizedException') {
      console.log('\n🔧 This suggests:');
      console.log('   - IAM permissions issue');
      console.log('   - User Pool ID might be incorrect');
    }
  }
}

checkCognitoEmailConfig().catch(console.error); 