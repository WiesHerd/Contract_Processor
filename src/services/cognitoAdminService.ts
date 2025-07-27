import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import config from '../amplifyconfiguration.json';

// Get AWS configuration from Amplify config with fallbacks
const getAWSConfig = () => {
  // Try environment variables first (for local development)
  const region = import.meta.env.VITE_AWS_REGION || config.aws_project_region || 'us-east-2';
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  
  return { region, accessKeyId, secretAccessKey };
};

const awsConfig = getAWSConfig();

const REGION = awsConfig.region;
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

const client = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  } : undefined, // Let AWS SDK use default credential chain
});

// Use environment-based API URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-gateway-url.amazonaws.com/prod' 
  : 'http://localhost:4000';

export async function listCognitoUsers() {
  try {
    console.log('🔍 Fetching real Cognito users from User Pool:', USER_POOL_ID);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito access');
    
    // Create authenticated Cognito client
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // List all users from the User Pool
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      AttributesToGet: ['email', 'given_name', 'family_name', 'phone_number', 'email_verified', 'phone_number_verified'],
      Limit: 60
    });
    
    const result = await client.send(listUsersCommand);
    
    if (!result.Users) {
      console.log('📝 No users found in Cognito User Pool');
      return [];
    }
    
    console.log(`📝 Found ${result.Users.length} users in Cognito User Pool`);
    
    // Get groups for each user
    const usersWithGroups = await Promise.all(
      result.Users.map(async (cognitoUser) => {
        try {
          const groupsCommand = new AdminListGroupsForUserCommand({
            Username: cognitoUser.Username,
            UserPoolId: USER_POOL_ID
          });
          
          const groupsResult = await client.send(groupsCommand);
          const groups = groupsResult.Groups?.map(group => group.GroupName) || [];
          
          console.log(`👤 User ${cognitoUser.Username} has groups:`, groups);
          
          return {
            Username: cognitoUser.Username,
            Attributes: cognitoUser.Attributes || [],
            Enabled: cognitoUser.Enabled,
            UserStatus: cognitoUser.UserStatus,
            groups: groups
          };
        } catch (error) {
          console.warn(`⚠️ Failed to get groups for user ${cognitoUser.Username}:`, error);
          return {
            Username: cognitoUser.Username,
            Attributes: cognitoUser.Attributes || [],
            Enabled: cognitoUser.Enabled,
            UserStatus: cognitoUser.UserStatus,
            groups: []
          };
        }
      })
    );
    
    console.log('✅ Successfully fetched real Cognito users with groups');
    return usersWithGroups;
    
  } catch (error) {
    console.error('❌ Error fetching Cognito users:', error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 