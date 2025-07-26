import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { generateClient } from 'aws-amplify/api';
import { listProviders } from '../graphql/queries';
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

interface HealthCheckResult {
  dynamodb: {
    connection: boolean;
    table: boolean;
    permissions: {
      read: boolean;
      write: boolean;
    };
  };
  amplify: {
    api: boolean;
    auth: boolean;
  };
  environment: {
    variables: {
      region: boolean;
      accessKey: boolean;
      secretKey: boolean;
    };
    valid: boolean;
  };
}

class HealthCheckError extends Error {
  constructor(
    message: string,
    public component: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    dynamodb: {
      connection: false,
      table: false,
      permissions: {
        read: false,
        write: false,
      },
    },
    amplify: {
      api: false,
      auth: false,
    },
    environment: {
      variables: {
        region: false,
        accessKey: false,
        secretKey: false,
      },
      valid: false,
    },
  };

  // Check environment variables
  try {
    result.environment.variables.region = !!awsConfig.region;
    result.environment.variables.accessKey = !!awsConfig.accessKeyId;
    result.environment.variables.secretKey = !!awsConfig.secretAccessKey;
    
    result.environment.valid = 
      result.environment.variables.region && 
      result.environment.variables.accessKey && 
      result.environment.variables.secretKey;
  } catch (error) {
    throw new HealthCheckError(
      'Failed to validate environment variables',
      'environment',
      error
    );
  }

  // Initialize DynamoDB client
  const dynamoClient = new DynamoDBClient({
    region: awsConfig.region,
    credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    } : undefined, // Let AWS SDK use default credential chain
  });

  // Check DynamoDB connection and table
  try {
    const describeTable = new DescribeTableCommand({
      TableName: import.meta.env.VITE_PROVIDER_TABLE_NAME || 'Provider',
    });
    
    await dynamoClient.send(describeTable);
    result.dynamodb.connection = true;
    result.dynamodb.table = true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      result.dynamodb.connection = true;
      result.dynamodb.table = false;
    } else {
      result.dynamodb.connection = false;
      result.dynamodb.table = false;
    }
  }

  // Check DynamoDB permissions
  try {
    const client = generateClient();
    await client.graphql({
      query: listProviders,
      variables: { limit: 1 }
    });
    result.dynamodb.permissions.read = true;
  } catch (error) {
    console.error('DynamoDB read permission check failed:', error);
  }

  // Check Amplify API
  try {
    const client = generateClient();
    await client.graphql({
      query: listProviders,
      variables: { limit: 1 }
    });
    result.amplify.api = true;
  } catch (error) {
    console.error('Amplify API check failed:', error);
  }

  // Check Amplify Auth (basic check)
  try {
    // This is a basic check - in a real app you might want to check auth state
    result.amplify.auth = true;
  } catch (error) {
    console.error('Amplify Auth check failed:', error);
  }

  return result;
}

export function validateHealthCheck(result: HealthCheckResult): string[] {
  const issues: string[] = [];

  if (!result.environment.valid) {
    issues.push('Missing required environment variables');
    if (!result.environment.variables.region) issues.push('- AWS Region not set');
    if (!result.environment.variables.accessKey) issues.push('- AWS Access Key not set');
    if (!result.environment.variables.secretKey) issues.push('- AWS Secret Key not set');
  }

  if (!result.dynamodb.connection) {
    issues.push('Cannot connect to DynamoDB');
  }

  if (!result.dynamodb.table) {
    issues.push('Provider table not found in DynamoDB');
  }

  if (!result.dynamodb.permissions.read) {
    issues.push('Missing DynamoDB read permissions');
  }

  if (!result.dynamodb.permissions.write) {
    issues.push('Missing DynamoDB write permissions');
  }

  if (!result.amplify.api) {
    issues.push('Cannot connect to Amplify API');
  }

  return issues;
} 