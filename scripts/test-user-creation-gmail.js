#!/usr/bin/env node

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function testUserCreationWithGmail() {
  console.log('🧪 Testing User Creation with wherdzik@gmail.com...\n');

  try {
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    const testUsername = `test.gmail.${Date.now()}`;
    const testEmail = 'wherdzik@gmail.com';
    
    console.log(`📝 Creating test user: ${testUsername}`);
    console.log(`📧 Email: ${testEmail}`);
    console.log(`📧 This should trigger welcome email to verified email...`);
    
    // Create user with SUPPRESS to test our custom email
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      TemporaryPassword: 'TestPass123!',
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: 'Test' },
        { Name: 'family_name', Value: 'Gmail' }
      ],
      MessageAction: 'SUPPRESS' // We'll send custom email
    });
    
    const result = await client.send(createCommand);
    
    console.log('✅ User created successfully!');
    console.log(`📝 User Status: ${result.User?.UserStatus}`);
    console.log(`📝 Enabled: ${result.User?.Enabled}`);
    
    console.log('\n📧 Now testing our custom SES email...');
    
    // Import and test our custom email service
    const { sendWelcomeEmailDirect } = await import('../src/services/simpleEmailService.ts');
    
    const emailResult = await sendWelcomeEmailDirect(
      testEmail,
      testUsername,
      'TestPass123!',
      'Test'
    );
    
    if (emailResult.success) {
      console.log('✅ Custom welcome email sent successfully!');
      console.log(`📧 Message ID: ${emailResult.messageId}`);
      console.log(`📬 Check your email (and spam folder) at: ${testEmail}`);
    } else {
      console.log('❌ Custom email failed:', emailResult.error);
    }
    
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
    
    console.log('\n💡 Summary:');
    console.log('   - User creation: ✅ Working');
    console.log('   - Custom email: ' + (emailResult.success ? '✅ Working' : '❌ Failed'));
    console.log('   - Check spam folder for emails');
    
  } catch (error) {
    console.error('❌ Error testing user creation:', error);
  }
}

testUserCreationWithGmail().catch(console.error); 