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
const USER_POOL_ID = 'contractgenerator7e5dfb2d_userpool_7e5dfb2d-production';

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
    // Use AWS SDK directly instead of REST API
    const { CognitoIdentityProviderClient, ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider');
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
    
    // Create authenticated Cognito client
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      AttributesToGet: ['email', 'given_name', 'family_name', 'phone_number', 'email_verified', 'phone_number_verified'],
      Limit: 60
    });
    
    const result = await client.send(command);
    
    // Transform the response to match expected format
    return result.Users?.map(user => ({
      Username: user.Username,
      Attributes: user.Attributes || [],
      Enabled: user.Enabled,
      UserStatus: user.UserStatus,
      groups: [] // Will be populated separately if needed
    })) || [];
    
  } catch (error) {
    console.error('Error fetching Cognito users:', error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 