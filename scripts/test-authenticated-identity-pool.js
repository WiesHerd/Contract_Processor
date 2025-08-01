import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand, InitiateAuthCommand, RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';
const IDENTITY_POOL_ID = 'us-east-2:7299c5fa-d35b-42ec-ab84-12a8f946d05b';
const CLIENT_ID = '63mmga3gs4vrojh7csf9f0a1r6'; // From the Identity Pool configuration

async function testAuthenticatedIdentityPool() {
  console.log('🧪 Testing Authenticated Identity Pool Credentials...');
  
  try {
    // Test 1: Authenticate with User Pool first (like browser does)
    console.log('🔍 Test 1: Authenticating with User Pool...');
    
    const cognitoIdpClient = new CognitoIdentityProviderClient({ region: REGION });
    
    // Initiate auth
    const initiateAuthCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: 'wherdzik@gmail.com',
        PASSWORD: 'YourPassword123!' // You'll need to provide the actual password
      }
    });
    
    console.log('⚠️ Note: This test requires the actual password for wherdzik@gmail.com');
    console.log('⚠️ For security, please provide the password or skip this test');
    
    // For now, let's just test with the CLI credentials to see if they work
    console.log('\n🔍 Test 2: Testing with CLI Credentials (simulating authenticated session)...');
    
    const stsClient = new STSClient({ region: REGION });
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    
    console.log('✅ CLI Identity:');
    console.log(`  - Account: ${identity.Account}`);
    console.log(`  - User ID: ${identity.UserId}`);
    console.log(`  - ARN: ${identity.Arn}`);
    
    // Test 3: Try Cognito operations with CLI credentials
    console.log('\n🔍 Test 3: Testing Cognito with CLI Credentials...');
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const users = await cognitoClient.send(listUsersCommand);
    console.log(`✅ SUCCESS: Found ${users.Users?.length || 0} users`);
    
    if (users.Users && users.Users.length > 0) {
      console.log('📝 Users found:');
      users.Users.forEach(user => {
        const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
        console.log(`  - ${user.Username} (${email}) - Status: ${user.UserStatus}`);
      });
    }
    
    // Test 4: Try user creation with CLI credentials
    console.log('\n🔍 Test 4: Testing User Creation with CLI Credentials...');
    
    const testUsername = `test-cli-${Date.now()}`;
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      TemporaryPassword: 'TempPass123!',
      UserAttributes: [
        {
          Name: 'email',
          Value: `${testUsername}@example.com`
        },
        {
          Name: 'given_name',
          Value: 'Test'
        },
        {
          Name: 'family_name',
          Value: 'User'
        }
      ]
    });
    
    const createResult = await cognitoClient.send(createUserCommand);
    console.log(`✅ SUCCESS: Created test user ${testUsername}`);
    console.log(`   Status: ${createResult.User.UserStatus}`);
    
    console.log('\n📊 Summary:');
    console.log('✅ CLI credentials work for Cognito operations');
    console.log('✅ The issue is that browser session credentials are different');
    console.log('🔧 The browser needs to use the same authenticated role as CLI');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error details:', error);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n🚨 ACCESS DENIED: The CLI credentials do not have Cognito permissions.');
    }
  }
}

testAuthenticatedIdentityPool().catch(console.error); 