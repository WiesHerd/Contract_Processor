import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';
const IDENTITY_POOL_ID = 'us-east-2:7299c5fa-d35b-42ec-ab84-12a8f946d05b';

async function testIdentityPoolCredentials() {
  console.log('🧪 Testing Identity Pool Credentials...');
  
  try {
    // Test 1: Get Identity Pool credentials (like browser does)
    console.log('🔍 Test 1: Getting Identity Pool Credentials...');
    
    const identityClient = new CognitoIdentityClient({ region: REGION });
    
    // First, get the identity ID
    const getIdCommand = new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID
    });
    
    const identityResult = await identityClient.send(getIdCommand);
    console.log(`✅ Got Identity ID: ${identityResult.IdentityId}`);
    
    // Get credentials for this identity
    const getCredentialsCommand = new GetCredentialsForIdentityCommand({
      IdentityId: identityResult.IdentityId
    });
    
    const credentialsResult = await identityClient.send(getCredentialsCommand);
    console.log('✅ Got Identity Pool Credentials');
    
    // Test 2: Check what identity these credentials represent
    console.log('\n🔍 Test 2: Checking Identity Pool Identity...');
    
    const stsClient = new STSClient({ 
      region: REGION,
      credentials: {
        accessKeyId: credentialsResult.Credentials.AccessKeyId,
        secretAccessKey: credentialsResult.Credentials.SecretKey,
        sessionToken: credentialsResult.Credentials.SessionToken,
      }
    });
    
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    
    console.log('✅ Identity Pool Identity:');
    console.log(`  - Account: ${identity.Account}`);
    console.log(`  - User ID: ${identity.UserId}`);
    console.log(`  - ARN: ${identity.Arn}`);
    
    // Test 3: Try Cognito operations with Identity Pool credentials
    console.log('\n🔍 Test 3: Testing Cognito with Identity Pool Credentials...');
    
    const cognitoClient = new CognitoIdentityProviderClient({ 
      region: REGION,
      credentials: {
        accessKeyId: credentialsResult.Credentials.AccessKeyId,
        secretAccessKey: credentialsResult.Credentials.SecretKey,
        sessionToken: credentialsResult.Credentials.SessionToken,
      }
    });
    
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
    
    // Test 4: Try user creation with Identity Pool credentials
    console.log('\n🔍 Test 4: Testing User Creation with Identity Pool Credentials...');
    
    const testUsername = `test-identity-pool-${Date.now()}`;
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
    console.log('✅ Identity Pool credentials obtained');
    console.log('✅ Identity check completed');
    console.log('✅ Cognito listing test completed');
    console.log('✅ Cognito user creation test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error details:', error);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n🚨 ACCESS DENIED: The Identity Pool credentials do not have Cognito permissions.');
      console.log('🔧 Solution: The Identity Pool authenticated role needs the CognitoAdminPolicy attached.');
    }
  }
}

testIdentityPoolCredentials().catch(console.error); 