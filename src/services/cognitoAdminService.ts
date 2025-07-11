import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-2';
const USER_POOL_ID = 'contractgenerator7e5dfb2d_userpool_7e5dfb2d-production';

const client = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

export async function listCognitoUsers() {
  const response = await fetch('http://localhost:4000/api/users');
  if (!response.ok) throw new Error('Failed to fetch users from backend proxy');
  return await response.json();
} 