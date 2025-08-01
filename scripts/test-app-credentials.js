import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';
const REGION = 'us-east-2';

async function testAppCredentials() {
  console.log('🧪 Testing App Credentials...\n');
  
  try {
    // Test 1: Check what identity the app would use
    console.log('🔍 Test 1: Checking App Identity...');
    try {
      const stsClient = new STSClient({ region: REGION });
      const identityCommand = new GetCallerIdentityCommand({});
      const identityResult = await stsClient.send(identityCommand);
      
      console.log('✅ App Identity:');
      console.log(`  - Account: ${identityResult.Account}`);
      console.log(`  - User ID: ${identityResult.UserId}`);
      console.log(`  - ARN: ${identityResult.Arn}`);
      
      // Check if this is the expected user
      if (identityResult.Arn.includes('contract-generator-app')) {
        console.log('✅ Using contract-generator-app user');
      } else if (identityResult.Arn.includes('wherdzik')) {
        console.log('⚠️  Using wherdzik@gmail.com session credentials');
        console.log('   This means the app is using Identity Pool session credentials');
        console.log('   The CognitoAdminPolicy needs to be on the Identity Pool role');
      } else {
        console.log('⚠️  Using different identity than expected');
      }
    } catch (error) {
      console.log(`❌ Failed to get identity: ${error.message}`);
    }

    console.log('\n🔍 Test 2: Testing Cognito with App Credentials...');
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    console.log('📋 Configuration:');
    console.log(`  - User Pool ID: ${USER_POOL_ID}`);
    console.log(`  - Region: ${REGION}\n`);
    
    console.log('🔍 Test 3: Listing Users with App Credentials...');
    try {
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 5
      });
      
      const result = await client.send(listUsersCommand);
      console.log(`✅ SUCCESS: Found ${result.Users?.length || 0} users`);
      
      if (result.Users && result.Users.length > 0) {
        console.log('📝 Users found:');
        result.Users.forEach(user => {
          const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value || 'No email';
          console.log(`  - ${user.Username} (${email}) - Status: ${user.UserStatus}`);
        });
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log(`   Error Code: ${error.name}`);
      console.log(`   HTTP Status: ${error.$metadata?.httpStatusCode}`);
      
      if (error.name === 'AccessDeniedException') {
        console.log('\n🔧 Troubleshooting AccessDeniedException:');
        console.log('   - The app is using Identity Pool session credentials');
        console.log('   - The CognitoAdminPolicy needs to be on the Identity Pool role');
        console.log('   - NOT on the contract-generator-app user');
        console.log('   - Go to AWS Console > Cognito > Identity pools');
        console.log('   - Find your Identity Pool and check its authenticated role');
      }
    }

    console.log('\n📊 Summary:');
    console.log('✅ Identity check completed');
    console.log('✅ Cognito test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAppCredentials().catch(console.error); 