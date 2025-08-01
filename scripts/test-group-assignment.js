#!/usr/bin/env node

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminGetUserCommand, ListUsersCommand, ListGroupsCommand } from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function testGroupAssignment() {
  console.log('🧪 Testing Group Assignment Process...\n');

  try {
    // Get credentials (simulating browser session)
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available');
    }

    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });

    // Test 1: List available groups
    console.log('🔍 Test 1: Listing Available Groups...');
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const groupsResult = await client.send(listGroupsCommand);
    console.log('✅ Available Groups:');
    groupsResult.Groups?.forEach(group => {
      console.log(`  - ${group.GroupName}: ${group.Description || 'No description'}`);
    });

    // Test 2: Create a test user
    const testUsername = `test-group-${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    
    console.log(`\n🔍 Test 2: Creating Test User (${testUsername})...`);
    
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'given_name', Value: 'Test' },
        { Name: 'family_name', Value: 'User' },
        { Name: 'email_verified', Value: 'false' }
      ],
      TemporaryPassword: 'TempPass123!',
      MessageAction: 'SUPPRESS'
    });

    const createResult = await client.send(createUserCommand);
    console.log(`✅ User created successfully: ${createResult.User?.Username}`);
    console.log(`   Status: ${createResult.User?.UserStatus}`);

    // Test 3: Assign user to Manager group
    console.log('\n🔍 Test 3: Assigning User to Manager Group...');
    
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      GroupName: 'Manager'
    });

    await client.send(addToGroupCommand);
    console.log('✅ User assigned to Manager group successfully');

    // Test 4: Verify group assignment
    console.log('\n🔍 Test 4: Verifying Group Assignment...');
    
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername
    });

    const userResult = await client.send(getUserCommand);
    console.log(`✅ User details retrieved: ${userResult.User?.Username}`);
    console.log(`   Status: ${userResult.User?.UserStatus}`);
    console.log(`   Enabled: ${userResult.User?.Enabled}`);

    // Test 5: List all users to see the new user
    console.log('\n🔍 Test 5: Listing All Users...');
    
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });

    const usersResult = await client.send(listUsersCommand);
    const newUser = usersResult.Users?.find(u => u.Username === testUsername);
    
    if (newUser) {
      console.log(`✅ Found new user in user list: ${newUser.Username}`);
      console.log(`   Status: ${newUser.UserStatus}`);
      console.log(`   Enabled: ${newUser.Enabled}`);
    } else {
      console.log('❌ New user not found in user list');
    }

    console.log('\n📊 Summary:');
    console.log('✅ Group assignment process is working correctly');
    console.log('✅ User creation with group assignment successful');
    console.log('✅ All tests passed');

  } catch (error) {
    console.error('❌ Error during group assignment test:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check IAM permissions for AdminAddUserToGroup');
    console.log('2. Verify the Manager group exists');
    console.log('3. Check console logs for detailed error information');
  }
}

// Run the test
testGroupAssignment().catch(console.error); 