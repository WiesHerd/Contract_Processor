import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { IAMClient, GetRoleCommand, ListAttachedRolePoliciesCommand, GetRolePolicyCommand } from '@aws-sdk/client-iam';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';
const ROLE_NAME = 'amplify-contractgenerator-production-78963-authRole';

async function testRolePermissions() {
  console.log('🧪 Testing Role Permissions...');
  
  try {
    // Test 1: Check the role details
    console.log('🔍 Test 1: Checking Role Details...');
    
    const iamClient = new IAMClient({ region: REGION });
    
    const getRoleCommand = new GetRoleCommand({
      RoleName: ROLE_NAME
    });
    
    const role = await iamClient.send(getRoleCommand);
    console.log('✅ Role Details:');
    console.log(`  - Role Name: ${role.Role.RoleName}`);
    console.log(`  - ARN: ${role.Role.Arn}`);
    console.log(`  - Trust Policy: ${JSON.stringify(role.Role.AssumeRolePolicyDocument, null, 2)}`);
    
    // Test 2: Check attached policies
    console.log('\n🔍 Test 2: Checking Attached Policies...');
    
    const listPoliciesCommand = new ListAttachedRolePoliciesCommand({
      RoleName: ROLE_NAME
    });
    
    const policies = await iamClient.send(listPoliciesCommand);
    console.log('✅ Attached Policies:');
    
    if (policies.AttachedPolicies && policies.AttachedPolicies.length > 0) {
      policies.AttachedPolicies.forEach(policy => {
        console.log(`  - ${policy.PolicyName} (${policy.PolicyArn})`);
      });
    } else {
      console.log('  - No attached policies found');
    }
    
    // Test 3: Check inline policies
    console.log('\n🔍 Test 3: Checking Inline Policies...');
    
    try {
      const getInlinePolicyCommand = new GetRolePolicyCommand({
        RoleName: ROLE_NAME,
        PolicyName: 'CognitoAdminPolicy'
      });
      
      const inlinePolicy = await iamClient.send(getInlinePolicyCommand);
      console.log('✅ Inline CognitoAdminPolicy found:');
      console.log(`  - Policy Document: ${JSON.stringify(inlinePolicy.PolicyDocument, null, 2)}`);
    } catch (error) {
      console.log('❌ Inline CognitoAdminPolicy not found:', error.message);
    }
    
    // Test 4: Test with CLI credentials (should work)
    console.log('\n🔍 Test 4: Testing with CLI Credentials...');
    
    const stsClient = new STSClient({ region: REGION });
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    
    console.log('✅ CLI Identity:');
    console.log(`  - Account: ${identity.Account}`);
    console.log(`  - User ID: ${identity.UserId}`);
    console.log(`  - ARN: ${identity.Arn}`);
    
    // Test 5: Try Cognito operations with CLI credentials
    console.log('\n🔍 Test 5: Testing Cognito with CLI Credentials...');
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const users = await cognitoClient.send(listUsersCommand);
    console.log(`✅ SUCCESS: Found ${users.Users?.length || 0} users`);
    
    // Test 6: Try user creation with CLI credentials
    console.log('\n🔍 Test 6: Testing User Creation with CLI Credentials...');
    
    const testUsername = `test-role-${Date.now()}`;
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
    console.log('✅ Role details checked');
    console.log('✅ Attached policies checked');
    console.log('✅ Inline policies checked');
    console.log('✅ CLI credentials work for Cognito operations');
    console.log('🔧 The issue is that the browser session credentials are not working');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error details:', error);
  }
}

testRolePermissions().catch(console.error); 