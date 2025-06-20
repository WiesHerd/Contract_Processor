import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { generateClient } from 'aws-amplify/api';
import { listProviders } from '../graphql/queries';

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

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly details?: any
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
    result.environment.variables.region = !!import.meta.env.VITE_AWS_REGION;
    result.environment.variables.accessKey = !!import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    result.environment.variables.secretKey = !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
    
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
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
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

  // Check Amplify API
  try {
    const client = generateClient();
    const testQuery = await client.graphql({
      query: listProviders,
      variables: { limit: 1 }
    });
    
    result.amplify.api = true;
    result.dynamodb.permissions.read = !!testQuery.data;
  } catch (error) {
    result.amplify.api = false;
    throw new HealthCheckError(
      'Failed to connect to Amplify API',
      'amplify',
      error
    );
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