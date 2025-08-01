#!/usr/bin/env node

import { CognitoIdentityProviderClient, AdminListGroupsForUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

async function checkNicoleGroups() {
  console.log('🔍 Checking Nicole\'s group assignments...\n');

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

    // Check Nicole's groups specifically
    console.log('🔍 Checking groups for user: nherdzik');
    
    const groupsCommand = new AdminListGroupsForUserCommand({
      Username: 'nherdzik',
      UserPoolId: USER_POOL_ID
    });
    
    const groupsResult = await client.send(groupsCommand);
    const groups = groupsResult.Groups?.map(group => group.GroupName) || [];
    
    console.log('✅ Nicole\'s groups:', groups);
    
    if (groups.length === 0) {
      console.log('❌ Nicole has no groups assigned');
      console.log('🔧 This means the group assignment during user creation failed');
    } else {
      console.log('✅ Nicole has groups assigned:', groups);
    }

    // Also check all users and their groups
    console.log('\n🔍 Checking all users and their groups...');
    
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const usersResult = await client.send(listUsersCommand);
    
    for (const user of usersResult.Users || []) {
      try {
        const userGroupsCommand = new AdminListGroupsForUserCommand({
          Username: user.Username,
          UserPoolId: USER_POOL_ID
        });
        
        const userGroupsResult = await client.send(userGroupsCommand);
        const userGroups = userGroupsResult.Groups?.map(group => group.GroupName) || [];
        
        console.log(`👤 ${user.Username}: ${userGroups.length > 0 ? userGroups.join(', ') : 'No groups'}`);
      } catch (error) {
        console.log(`❌ Error getting groups for ${user.Username}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error checking Nicole\'s groups:', error);
  }
}

// Run the check
checkNicoleGroups().catch(console.error); 