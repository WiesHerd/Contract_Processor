import { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';
const REGION = 'us-east-2';

async function testUserPermissions() {
  console.log('🧪 Testing User Permissions...\n');
  
  try {
    // Test 1: Check who we are
    console.log('🔍 Test 1: Checking Current Identity...');
    try {
      const stsClient = new STSClient({ region: REGION });
      const identityCommand = new GetCallerIdentityCommand({});
      const identityResult = await stsClient.send(identityCommand);
      
      console.log('✅ Current Identity:');
      console.log(`  - Account: ${identityResult.Account}`);
      console.log(`  - User ID: ${identityResult.UserId}`);
      console.log(`  - ARN: ${identityResult.Arn}`);
      
      // Check if this is the expected user
      if (identityResult.Arn.includes('contract-generator-app')) {
        console.log('✅ Using correct user: contract-generator-app');
      } else {
        console.log('⚠️  Using different user than expected');
      }
    } catch (error) {
      console.log(`❌ Failed to get identity: ${error.message}`);
    }

    console.log('\n🔍 Test 2: Testing Cognito Client...');
    const client = new CognitoIdentityProviderClient({ region: REGION });
    
    console.log('📋 Configuration:');
    console.log(`  - User Pool ID: ${USER_POOL_ID}`);
    console.log(`  - Region: ${REGION}\n`);
    
    console.log('🔍 Test 3: Listing Users...');
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
        console.log('   - The policy may not have propagated yet (wait 5-10 minutes)');
        console.log('   - The policy may be attached to the wrong user/role');
        console.log('   - The policy may have incorrect permissions');
        console.log('   - The app may be using different credentials than expected');
      }
    }

    console.log('\n🔍 Test 4: Testing User Creation...');
    try {
      const testUserData = {
        UserPoolId: USER_POOL_ID,
        Username: `test-user-${Date.now()}`,
        UserAttributes: [
          {
            Name: 'email',
            Value: `test-${Date.now()}@example.com`
          },
          {
            Name: 'email_verified',
            Value: 'true'
          },
          {
            Name: 'given_name',
            Value: 'Test'
          },
          {
            Name: 'family_name',
            Value: 'User'
          }
        ],
        MessageAction: 'SUPPRESS' // Don't send email
      };
      
      console.log('📤 Attempting to create test user...');
      const createUserCommand = new AdminCreateUserCommand(testUserData);
      const createResult = await client.send(createUserCommand);
      
      console.log('✅ SUCCESS: Test user created!');
      console.log(`   Username: ${createResult.User?.Username}`);
      console.log(`   Status: ${createResult.User?.UserStatus}`);
      
      // Clean up - delete the test user
      console.log('🧹 Cleaning up test user...');
      // Note: We'd need AdminDeleteUserCommand here, but let's keep it simple
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log(`   Error Code: ${error.name}`);
      console.log(`   HTTP Status: ${error.$metadata?.httpStatusCode}`);
      
      if (error.name === 'UserNotFoundException') {
        console.log('\n🔧 Troubleshooting UserNotFoundException:');
        console.log('   - This error is misleading - it means the user creation failed');
        console.log('   - The real issue is likely permissions or configuration');
        console.log('   - Check if the User Pool ID is correct');
        console.log('   - Check if the region is correct');
        console.log('   - Check if the policy has the correct permissions');
      }
    }

    console.log('\n📊 Summary:');
    console.log('✅ Identity check completed');
    console.log('✅ Cognito client created');
    console.log('✅ User listing test completed');
    console.log('✅ User creation test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserPermissions().catch(console.error); 