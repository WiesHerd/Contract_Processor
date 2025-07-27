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
    // For now, return a simple mock response to test the UI
    // This will help us verify the User Management interface works
    const mockUsers = [
      {
        Username: 'wherdzik@gmail.com',
        Attributes: [
          { Name: 'email', Value: 'wherdzik@gmail.com' },
          { Name: 'email_verified', Value: 'true' }
        ],
        Enabled: true,
        UserStatus: 'CONFIRMED',
        groups: ['admin']
      },
      {
        Username: 'test@example.com',
        Attributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'email_verified', Value: 'true' }
        ],
        Enabled: true,
        UserStatus: 'CONFIRMED',
        groups: ['user']
      }
    ];
    
    console.log('🔍 Mock users returned for User Management testing');
    return mockUsers;
    
  } catch (error) {
    console.error('Error fetching Cognito users:', error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 