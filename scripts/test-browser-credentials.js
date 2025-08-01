import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function testBrowserCredentials() {
  console.log('🧪 Testing Browser Session Credentials...');
  
  try {
    // Test 1: Check what identity we're using
    console.log('🔍 Test 1: Checking Browser Identity...');
    
    const stsClient = new STSClient({ region: REGION });
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    
    console.log('✅ Browser Identity:');
    console.log(`  - Account: ${identity.Account}`);
    console.log(`  - User ID: ${identity.UserId}`);
    console.log(`  - ARN: ${identity.Arn}`);
    
    // Test 2: Try Cognito operations with browser credentials
    console.log('\n🔍 Test 2: Testing Cognito with Browser Credentials...');
    
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
    
    console.log('\n📊 Summary:');
    console.log('✅ Browser identity check completed');
    console.log('✅ Cognito test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error details:', error);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n🚨 ACCESS DENIED: The browser session credentials do not have Cognito permissions.');
      console.log('🔧 Solution: The Identity Pool authenticated role needs the CognitoAdminPolicy attached.');
    }
  }
}

testBrowserCredentials().catch(console.error); 