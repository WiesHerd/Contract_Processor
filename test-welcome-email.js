require('dotenv').config();
const { CognitoIdentityProviderClient, AdminCreateUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

const client = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testWelcomeEmail() {
  try {
    // Create a test user with your email
    const testUsername = `test-user-${Date.now()}@yourcompany.com`;
    const testEmail = 'your-email@yourcompany.com'; // Replace with your email
    
    console.log('Creating test user...');
    console.log(`Username: ${testUsername}`);
    console.log(`Email: ${testEmail}`);
    
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: 'TempPass123!',
      // This will trigger the welcome email with your custom template
    });
    
    const response = await client.send(command);
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Check your email inbox for the customized welcome email');
    console.log('📧 Also check spam/junk folder if not found');
    console.log('');
    console.log('User details:');
    console.log(`- Username: ${response.User.Username}`);
    console.log(`- Status: ${response.User.UserStatus}`);
    console.log(`- Enabled: ${response.User.Enabled}`);
    
    console.log('');
    console.log('🎉 If you received the email with your custom template, the setup is working!');
    console.log('🗑️  You can delete this test user later from the AWS Console or admin dashboard.');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('Make sure your AWS credentials are configured correctly');
  }
}

// Run the test
testWelcomeEmail(); 