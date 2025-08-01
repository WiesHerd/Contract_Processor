#!/usr/bin/env node

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function testCognitoEmail() {
  console.log('🧪 Testing Cognito Built-in Email System...\n');

  try {
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    const testUsername = `test.email.${Date.now()}`;
    const testEmail = 'wherdzik@gmail.com';
    
    console.log(`📝 Creating test user: ${testUsername}`);
    console.log(`📧 Email: ${testEmail}`);
    console.log(`📧 This should trigger Cognito's built-in welcome email...`);
    
    // Create user with RESEND to trigger Cognito's email
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      TemporaryPassword: 'TestPass123!',
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: 'Test' },
        { Name: 'family_name', Value: 'Email' }
      ],
      MessageAction: 'RESEND' // This should trigger Cognito's email
    });
    
    const result = await client.send(createCommand);
    
    console.log('✅ User created successfully!');
    console.log(`📝 User Status: ${result.User?.UserStatus}`);
    console.log(`📝 Enabled: ${result.User?.Enabled}`);
    
    console.log('\n📧 Cognito should have sent a welcome email to:', testEmail);
    console.log('📧 Check your inbox (and spam folder) for the email');
    
    // Clean up - delete the test user
    console.log('\n🧹 Cleaning up test user...');
    try {
      const deleteCommand = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: testUsername
      });
      
      await client.send(deleteCommand);
      console.log('✅ Test user deleted');
    } catch (deleteError) {
      console.log('⚠️ Could not delete test user (may not exist):', deleteError.message);
    }
    
    console.log('\n💡 If you received the email:');
    console.log('   - Cognito email system is working');
    console.log('   - The issue is with our Lambda fallback');
    console.log('\n💡 If you did NOT receive the email:');
    console.log('   - Cognito email system is not configured');
    console.log('   - Need to check Cognito User Pool settings');
    
  } catch (error) {
    console.error('❌ Error testing Cognito email:', error);
    
    if (error.name === 'NotAuthorizedException') {
      console.log('\n🔧 This suggests:');
      console.log('   - IAM permissions issue');
      console.log('   - User Pool ID might be incorrect');
    }
  }
}

testCognitoEmail().catch(console.error); 