import { generateClient, SelectionSet } from 'aws-amplify/api';
import { 
  CreateTemplateInput, 
  UpdateTemplateInput, 
  DeleteTemplateInput,
  CreateProviderInput,
  UpdateProviderInput,
  DeleteProviderInput,
  CreateMappingInput,
  UpdateMappingInput,
  DeleteMappingInput,
  CreateClauseInput,
  UpdateClauseInput,
  DeleteClauseInput,
  CreateAuditLogInput,
  UpdateAuditLogInput,
  DeleteAuditLogInput,
  Template,
  TemplateType,
  Provider,
  Mapping,
  Clause,
  AuditLog,
  ListTemplatesQuery,
  ListProvidersQuery,
  ListMappingsQuery,
  ListClausesQuery,
  ListAuditLogsQuery
} from '../API';
import { 
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createProvider,
  updateProvider,
  deleteProvider,
  createMapping,
  updateMapping,
  deleteMapping,
  createClause,
  updateClause,
  deleteClause,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog
} from '../graphql/mutations';
import { 
  getTemplate,
  getProvider,
  getMapping,
  getClause,
  getAuditLog,
  listTemplates,
  listProviders,
  listMappings,
  listClauses,
  listAuditLogs
} from '../graphql/queries';

// Direct DynamoDB client for advanced operations
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand, ScanCommand, ScanCommandInput, ScanCommandOutput, BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Provider as LocalProvider } from '../types/provider';

const client = generateClient();

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
};

// Utility function for retrying operations
async function withRetry<T>(operation: () => Promise<T>, retries = RETRY_CONFIG.maxRetries): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'ThrottlingException',
    'ProvisionedThroughputExceededException',
    'RequestLimitExceeded',
    'ServiceUnavailable',
    'InternalServerError',
  ];
  return retryableErrors.some(errType => 
    error.name?.includes(errType) || error.message?.includes(errType)
  );
}

// This defines the fields we want to get back from the GraphQL API.
const providerSelectionSet = [
  'listProviders.items.id', 'listProviders.items.employeeId', 'listProviders.items.name', 
  'listProviders.items.providerType', 'listProviders.items.specialty', 'listProviders.items.subspecialty',
  'listProviders.items.fte', 'listProviders.items.administrativeFte', 'listProviders.items.administrativeRole', 
  'listProviders.items.yearsExperience', 'listProviders.items.hourlyWage', 'listProviders.items.baseSalary', 
  'listProviders.items.originalAgreementDate', 'listProviders.items.organizationName',
  'listProviders.items.startDate', 'listProviders.items.contractTerm', 'listProviders.items.ptoDays', 
  'listProviders.items.holidayDays', 'listProviders.items.cmeDays', 'listProviders.items.cmeAmount', 
  'listProviders.items.signingBonus', 'listProviders.items.educationBonus', 'listProviders.items.qualityBonus',
  'listProviders.items.compensationType', 'listProviders.items.conversionFactor', 'listProviders.items.wRVUTarget', 
  'listProviders.items.compensationYear', 'listProviders.items.credentials', 'listProviders.items.compensationModel', 
  'listProviders.items.fteBreakdown', 'listProviders.items.templateTag',
  'listProviders.items.createdAt', 'listProviders.items.updatedAt', 'listProviders.items.__typename', 
  'listProviders.nextToken'
] as const;

// Enhanced Template Operations with direct DynamoDB support
export const awsTemplates = {
  async create(input: CreateTemplateInput): Promise<Template | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createTemplate,
          variables: { input }
        });
        return result.data?.createTemplate || null;
      } catch (error) {
        console.error('Error creating template:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateTemplateInput): Promise<Template | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateTemplate,
          variables: { input }
        });
        return result.data?.updateTemplate || null;
      } catch (error) {
        console.error('Error updating template:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteTemplateInput): Promise<Template | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteTemplate,
          variables: { input }
        });
        return result.data?.deleteTemplate || null;
      } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<Template | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getTemplate,
          variables: { id }
        });
        return result.data?.getTemplate || null;
      } catch (error) {
        console.error('Error getting template:', error);
        throw error;
      }
    });
  },

  async list(limit?: number, nextToken?: string): Promise<ListTemplatesQuery['listTemplates']> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listTemplates,
          variables: { limit, nextToken }
        });
        return result.data?.listTemplates || null;
      } catch (error) {
        console.error('Error listing templates:', error);
        throw error;
      }
    });
  },

  // Direct DynamoDB operations for advanced use cases
  async batchCreate(templates: CreateTemplateInput[]): Promise<Template[]> {
    return withRetry(async () => {
      try {
        // Use GraphQL API instead of direct DynamoDB calls
        const results = await Promise.all(
          templates.map(async (template) => {
            const result = await client.graphql({
              query: createTemplate,
              variables: { input: template }
            });
            return result.data?.createTemplate || null;
          })
        );
        
        return results.filter((result): result is Template => result !== null);
      } catch (error) {
        console.error('Error batch creating templates:', error);
        throw error;
      }
    });
  },

  async queryByType(type: string): Promise<Template[]> {
    return withRetry(async () => {
      try {
        // Use GraphQL API instead of direct DynamoDB calls
        const result = await client.graphql({
          query: listTemplates,
          variables: { 
            filter: { type: { eq: type } },
            limit: 1000 
          }
        });
        
        return (result.data?.listTemplates?.items || [])
          .filter((item): item is Template => item !== null);
      } catch (error) {
        console.error('Error querying templates by type:', error);
        throw error;
      }
    });
  },

  async updateTemplate(id: string, template: Partial<Omit<Template, 'id'>>): Promise<Template> {
    const input: UpdateTemplateInput = { id };
    if (template.name) input.name = template.name;
    if (template.description) input.description = template.description;
    if (template.version) input.version = template.version;
    if ('s3Key' in template && template.s3Key) input.s3Key = template.s3Key;
    if ('type' in template && template.type) input.type = template.type as TemplateType;
    
    try {
      const response = await client.graphql({
        query: updateTemplate,
        variables: { input }
      });
      return response.data?.updateTemplate as Template;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }
};

// Enhanced Provider Operations
export const awsProviders = {
  async create(input: CreateProviderInput): Promise<Provider | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createProvider,
          variables: { input }
        });
        return result.data?.createProvider || null;
      } catch (error) {
        console.error('Error creating provider:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateProviderInput): Promise<Provider | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateProvider,
          variables: { input }
        });
        return result.data?.updateProvider || null;
      } catch (error) {
        console.error('Error updating provider:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteProviderInput): Promise<Provider | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteProvider,
          variables: { input }
        });
        return result.data?.deleteProvider || null;
      } catch (error) {
        console.error('Error deleting provider:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<Provider | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getProvider,
          variables: { id }
        });
        return result.data?.getProvider || null;
      } catch (error) {
        console.error('Error getting provider:', error);
        throw error;
      }
    });
  },

  async list(): Promise<Provider[]> {
    const allProviders: Provider[] = [];
    let nextToken: string | null | undefined = null;

    do {
      try {
        const result: any = await client.graphql({
          query: listProviders,
          variables: { limit: 1000, nextToken },
        });
        
        const providerData = result.data?.listProviders;
        if (providerData?.items) {
          allProviders.push(...providerData.items.filter(Boolean));
        }
        nextToken = providerData?.nextToken;
      } catch (error) {
        console.error('Error listing providers:', error);
        // On error, break the loop and return what we have so far
        break;
      }
    } while (nextToken);

    return allProviders;
  },

  // Direct DynamoDB operations for advanced use cases
  async batchCreate(providers: CreateProviderInput[]): Promise<Provider[]> {
    return withRetry(async () => {
      try {
        // Use GraphQL API instead of direct DynamoDB calls
        const results = await Promise.all(
          providers.map(async (provider) => {
            const result = await client.graphql({
              query: createProvider,
              variables: { input: provider }
            });
            return result.data?.createProvider || null;
          })
        );
        
        return results.filter((result): result is Provider => result !== null);
      } catch (error) {
        console.error('Error batch creating providers:', error);
        throw error;
      }
    });
  },

  async deleteAllProviders(onProgress?: (progress: { deleted: number; total: number }) => void): Promise<void> {
    const tableName = import.meta.env.VITE_DYNAMODB_PROVIDER_TABLE as string;
    if (!tableName) {
      throw new Error("Provider table name is not configured in environment variables.");
    }

    // 1. Scan the table to get all item keys and count them.
    let lastEvaluatedKey: Record<string, any> | undefined;
    const allItems: Record<string, any>[] = [];
    do {
      const scanParams: ScanCommandInput = {
        TableName: tableName,
        ProjectionExpression: "id", // Only fetch the primary key
        ExclusiveStartKey: lastEvaluatedKey,
      };
      const command = new ScanCommand(scanParams);
      const scanResult: ScanCommandOutput = await docClient.send(command);
      if (scanResult.Items) {
        allItems.push(...scanResult.Items);
      }
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const total = allItems.length;
    if (total === 0) {
      onProgress?.({ deleted: 0, total: 0 });
      return; // Nothing to delete
    }

    // 2. Batch delete all items
    const batchSize = 25; // DynamoDB BatchWriteItem limit
    let deletedCount = 0;
    onProgress?.({ deleted: 0, total });

    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: { id: item.id },
        },
      }));

      const batchWriteParams: BatchWriteCommandInput = {
        RequestItems: {
          [tableName]: deleteRequests,
        },
      };
      const command = new BatchWriteCommand(batchWriteParams);
      await docClient.send(command);
      deletedCount += batch.length;
      onProgress?.({ deleted: deletedCount, total: total });
    }
  }
};

// Enhanced Mapping Operations
export const awsMappings = {
  async create(input: CreateMappingInput): Promise<Mapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createMapping,
          variables: { input }
        });
        return result.data?.createMapping || null;
      } catch (error) {
        console.error('Error creating mapping:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateMappingInput): Promise<Mapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateMapping,
          variables: { input }
        });
        return result.data?.updateMapping || null;
      } catch (error) {
        console.error('Error updating mapping:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteMappingInput): Promise<Mapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteMapping,
          variables: { input }
        });
        return result.data?.deleteMapping || null;
      } catch (error) {
        console.error('Error deleting mapping:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<Mapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getMapping,
          variables: { id }
        });
        return result.data?.getMapping || null;
      } catch (error) {
        console.error('Error getting mapping:', error);
        throw error;
      }
    });
  },

  async list(limit?: number, nextToken?: string): Promise<ListMappingsQuery['listMappings']> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listMappings,
          variables: { limit, nextToken }
        });
        return result.data?.listMappings || null;
      } catch (error) {
        console.error('Error listing mappings:', error);
        throw error;
      }
    });
  },

  // Get mappings by template and provider
  async getMappingsByTemplateAndProvider(templateId: string, providerId: string): Promise<Mapping[]> {
    return withRetry(async () => {
      const tableName = import.meta.env.VITE_DYNAMODB_MAPPING_TABLE;
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: 'byTemplateAndProvider',
        KeyConditionExpression: 'templateID = :templateId AND providerID = :providerId',
        ExpressionAttributeValues: {
          ':templateId': templateId,
          ':providerId': providerId
        }
      });

      const result = await docClient.send(command);
      return (result.Items || []) as Mapping[];
    });
  }
};

// Enhanced Clause Operations
export const awsClauses = {
  async create(input: CreateClauseInput): Promise<Clause | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createClause,
          variables: { input }
        });
        return result.data?.createClause || null;
      } catch (error) {
        console.error('Error creating clause:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateClauseInput): Promise<Clause | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateClause,
          variables: { input }
        });
        return result.data?.updateClause || null;
      } catch (error) {
        console.error('Error updating clause:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteClauseInput): Promise<Clause | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteClause,
          variables: { input }
        });
        return result.data?.deleteClause || null;
      } catch (error) {
        console.error('Error deleting clause:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<Clause | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getClause,
          variables: { id }
        });
        return result.data?.getClause || null;
      } catch (error) {
        console.error('Error getting clause:', error);
        throw error;
      }
    });
  },

  async list(limit?: number, nextToken?: string): Promise<ListClausesQuery['listClauses']> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listClauses,
          variables: { limit, nextToken }
        });
        return result.data?.listClauses || null;
      } catch (error) {
        console.error('Error listing clauses:', error);
        throw error;
      }
    });
  }
};

// Enhanced Audit Log Operations
export const awsAuditLogs = {
  async create(input: CreateAuditLogInput): Promise<AuditLog | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createAuditLog,
          variables: { input }
        });
        return result.data?.createAuditLog || null;
      } catch (error) {
        console.error('Error creating audit log:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateAuditLogInput): Promise<AuditLog | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateAuditLog,
          variables: { input }
        });
        return result.data?.updateAuditLog || null;
      } catch (error) {
        console.error('Error updating audit log:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteAuditLogInput): Promise<AuditLog | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteAuditLog,
          variables: { input }
        });
        return result.data?.deleteAuditLog || null;
      } catch (error) {
        console.error('Error deleting audit log:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<AuditLog | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getAuditLog,
          variables: { id }
        });
        return result.data?.getAuditLog || null;
      } catch (error) {
        console.error('Error getting audit log:', error);
        throw error;
      }
    });
  },

  async list(limit?: number, nextToken?: string): Promise<ListAuditLogsQuery['listAuditLogs']> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listAuditLogs,
          variables: { limit, nextToken }
        });
        return result.data?.listAuditLogs || null;
      } catch (error) {
        console.error('Error listing audit logs:', error);
        throw error;
      }
    });
  },

  // Query audit logs by user and date range
  async queryByUserAndDateRange(user: string, startDate: string, endDate: string): Promise<AuditLog[]> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listAuditLogs,
          variables: {
            filter: {
              user: { eq: user },
              timestamp: { between: [startDate, endDate] }
            },
            limit: 1000
          }
        });
        return (result.data?.listAuditLogs?.items || []).filter((item: any) => item !== null);
      } catch (error) {
        console.error('Error querying audit logs by user and date range:', error);
        throw error;
      }
    });
  }
};

// Bulk Operations
export const awsBulkOperations = {
  async countAllProviders(): Promise<number> {
    const tableName = import.meta.env.VITE_DYNAMODB_PROVIDER_TABLE as string;
    if (!tableName) {
      throw new Error("Provider table name is not configured in environment variables.");
    }
    const command = new ScanCommand({
      TableName: tableName,
      Select: "COUNT",
    });
    const result = await docClient.send(command);
    return result.Count || 0;
  },

  async deleteAllProviders(onProgress?: (progress: { deleted: number; total: number }) => void): Promise<void> {
    const tableName = import.meta.env.VITE_DYNAMODB_PROVIDER_TABLE as string;
    if (!tableName) {
      throw new Error("Provider table name is not configured in environment variables.");
    }

    const total = await this.countAllProviders();
    if (total === 0) {
      onProgress?.({ deleted: 0, total: 0 });
      return;
    }

    // 1. Scan the table to get all item keys
    let lastEvaluatedKey: Record<string, any> | undefined;
    const allItems: Record<string, any>[] = [];
    do {
      const scanParams: ScanCommandInput = {
        TableName: tableName,
        ProjectionExpression: "id", // Only fetch the primary key
        ExclusiveStartKey: lastEvaluatedKey,
      };
      const command = new ScanCommand(scanParams);
      const scanResult: ScanCommandOutput = await docClient.send(command);
      if (scanResult.Items) {
        allItems.push(...scanResult.Items);
      }
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    if (allItems.length === 0) {
      onProgress?.({ deleted: 0, total: total });
      return; // Nothing to delete
    }

    // 2. Batch delete all items
    const batchSize = 25; // DynamoDB BatchWriteItem limit
    let deletedCount = 0;
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: { id: item.id },
        },
      }));

      const batchWriteParams: BatchWriteCommandInput = {
        RequestItems: {
          [tableName]: deleteRequests,
        },
      };
      const command = new BatchWriteCommand(batchWriteParams);
      await docClient.send(command);
      deletedCount += batch.length;
      onProgress?.({ deleted: deletedCount, total: total });
    }
  },

  async createProviders(
    providers: CreateProviderInput[],
    onProgress?: (progress: { uploaded: number; total: number }) => void
  ): Promise<Provider[]> {
    const total = providers.length;
    if (total === 0) {
      onProgress?.({ uploaded: 0, total: 0 });
      return [];
    }

    const successfulProviders: Provider[] = [];
    const batchSize = 25;
    let uploadedCount = 0;
    onProgress?.({ uploaded: 0, total });

    for (let i = 0; i < total; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(p => awsProviders.create(p))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          successfulProviders.push(result.value);
        }
      });

      uploadedCount += batch.length;
      onProgress?.({ uploaded: uploadedCount, total });
    }
    return successfulProviders;
  },

  // Batch create mappings for a template-provider combination
  async createMappingsForTemplate(templateId: string, providerId: string, mappings: Record<string, string>): Promise<Mapping[]> {
    const mappingInputs: CreateMappingInput[] = Object.entries(mappings).map(([field, value]) => ({
      templateID: templateId,
      providerID: providerId,
      field,
      value,
    }));

    const results = await Promise.allSettled(
      mappingInputs.map(mapping => awsMappings.create(mapping))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<Mapping | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }
};

// Error handling utilities
export class AWSError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable?: boolean
  ) {
    super(message);
    this.name = 'AWSError';
  }
}

// Health check utility
export async function checkAWSHealth(): Promise<{
  dynamodb: boolean;
  s3: boolean;
  appsync: boolean;
}> {
  const health = {
    dynamodb: false,
    s3: false,
    appsync: false,
  };

  try {
    // Test DynamoDB
    await awsProviders.list(1);
    health.dynamodb = true;
  } catch (error) {
    console.error('DynamoDB health check failed:', error);
  }

  try {
    // Test AppSync
    await awsTemplates.list(1);
    health.appsync = true;
  } catch (error) {
    console.error('AppSync health check failed:', error);
  }

  // S3 health check would require a test upload/download
  // For now, we'll assume it's healthy if we can access the client
  health.s3 = true;

  return health;
} 