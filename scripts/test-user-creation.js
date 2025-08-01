#!/usr/bin/env node

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR'; // Your actual User Pool ID

async function testUserCreation() {
  console.log('🧪 Testing User Creation and Email...\n');

  try {
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    const testUsername = `test.user.${Date.now()}`;
    const testEmail = 'wherdzik@gmail.com';
    
    console.log(`📝 Creating test user: ${testUsername}`);
    console.log(`📧 Email: ${testEmail}`);
    
    // Create user with SUPPRESS to avoid Cognito's default email
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      TemporaryPassword: 'TestPass123!',
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: 'Test' },
        { Name: 'family_name', Value: 'User' }
      ],
      MessageAction: 'SUPPRESS' // Don't send Cognito's default email
    });
    
    const result = await client.send(createCommand);
    
    console.log('✅ User created successfully!');
    console.log(`📝 User Status: ${result.User?.UserStatus}`);
    console.log(`📝 Enabled: ${result.User?.Enabled}`);
    
    // Check if user exists
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername
    });
    
    const userResult = await client.send(getUserCommand);
    console.log('✅ User verification successful');
    console.log(`📧 Email: ${userResult.User?.Attributes?.find(attr => attr.Name === 'email')?.Value}`);
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check your email for welcome message');
    console.log('2. If no email, the Lambda function may not be deployed yet');
    console.log('3. Try creating a user through the web app');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    
    if (error.name === 'NotAuthorizedException') {
      console.log('\n🔧 This suggests:');
      console.log('   - IAM permissions issue');
      console.log('   - User Pool ID might be incorrect');
      console.log('   - Need to use session credentials');
    }
  }
}

testUserCreation().catch(console.error); 