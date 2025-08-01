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
  Provider,
  Mapping,
  Clause,
  AuditLog,
  ListTemplatesQuery,
  ListProvidersQuery,
  ListMappingsQuery,
  ListClausesQuery,
  ListAuditLogsQuery,
  CreateTemplateMappingInput,
  UpdateTemplateMappingInput,
  DeleteTemplateMappingInput,
  TemplateMapping,
  ListTemplateMappingsQuery
} from '../API';
import { TemplateType } from '../types/template';
import { 
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createProvider,
  updateProvider,
  deleteProvider,
  deleteProviderCustom,
  createMapping,
  updateMapping,
  deleteMapping,
  createClause,
  updateClause,
  deleteClause,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
  createTemplateMapping,
  updateTemplateMapping,
  deleteTemplateMapping
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
  listAuditLogs,
  getTemplateMapping,
  listTemplateMappings,
  providersByCompensationYear,
  providersByCompensationYearCustom,
  listProvidersCustom
} from '../graphql/queries';

// Direct DynamoDB client for advanced operations
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand, ScanCommand, ScanCommandInput, ScanCommandOutput, BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Provider as LocalProvider } from '../types/provider';
import { withRetry, isRetryableError, AWSError } from './retry';
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

// NOTE: Amplify is configured in main.tsx to use VITE_AWS_APPSYNC_GRAPHQL_ENDPOINT if present.
const client = generateClient();

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: awsConfig.region,
  credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  } : undefined, // Let AWS SDK use default credential chain
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

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

// Add a debug logger that appends to a global array for browser inspection
// Declare the global property for TypeScript
declare global {
  interface Window {
    _providerDebugLog?: string[];
  }
}
function providerDebugLog(msg: string) {
  if (typeof window !== 'undefined') {
    (window as any)._providerDebugLog = (window as any)._providerDebugLog || [];
    (window as any)._providerDebugLog.push(msg);
  }
}

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

// Custom GraphQL mutation that only requests fields that exist in the schema
const createProviderCustom = /* GraphQL */ `
  mutation CreateProvider($input: CreateProviderInput!) {
    createProvider(input: $input) {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      organizationId
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      qualityBonus
      educationBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      administrativeFte
      administrativeRole
      totalFTE
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
    }
  }
`;

// Enhanced Provider Operations
export const awsProviders = {
  create: async (input: CreateProviderInput): Promise<Provider> => {
    console.log('[awsProviders.create] Creating provider with input:', input);
    console.log('[awsProviders.create] Input keys:', Object.keys(input));
    
    // Create a minimal input with only the fields we know are definitely in the deployed schema
    const minimalInput = {
      id: input.id,
      name: input.name || 'Unknown Provider',
      employeeId: input.employeeId || '',
      providerType: input.providerType || '',
      specialty: input.specialty || '',
      subspecialty: input.subspecialty || '',
      yearsExperience: input.yearsExperience || 0,
      hourlyWage: input.hourlyWage || 0,
      baseSalary: input.baseSalary || 0,
      originalAgreementDate: input.originalAgreementDate || null,
      organizationName: input.organizationName || 'Default Organization',
      organizationId: input.organizationId || 'default',
      startDate: input.startDate || null,
      contractTerm: input.contractTerm || '',
      ptoDays: input.ptoDays || 0,
      holidayDays: input.holidayDays || 0,
      cmeDays: input.cmeDays || 0,
      cmeAmount: input.cmeAmount || 0,
      signingBonus: input.signingBonus || 0,
      qualityBonus: input.qualityBonus || 0,
      educationBonus: input.educationBonus || 0,
      compensationType: input.compensationType || '',
      conversionFactor: input.conversionFactor || 0,
      wRVUTarget: input.wRVUTarget || 0,
      compensationYear: input.compensationYear || '',
      credentials: input.credentials || '',
      compensationModel: input.compensationModel || '',
      administrativeFte: input.administrativeFte || 0,
      templateTag: input.templateTag || '',
      dynamicFields: input.dynamicFields || null
    };

    console.log('[awsProviders.create] Minimal input:', minimalInput);
    console.log('[awsProviders.create] Input keys:', Object.keys(minimalInput));

    try {
      const result = await client.graphql({
        query: createProvider,
        variables: { input: minimalInput }
      });

      console.log('[awsProviders.create] GraphQL result:', result);
      
      return (result as any).data?.createProvider;
    } catch (error) {
      console.error('[awsProviders.create] Error creating provider:', error);
      console.error('[awsProviders.create] Provider input that failed:', input);
      
      if (error.errors) {
        console.error('[awsProviders.create] GraphQL errors:', error.errors);
        console.error('[awsProviders.create] Full error object:', JSON.stringify(error, null, 2));
      }
      
      throw error;
    }
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

  async list(year?: number): Promise<Provider[]> {
    console.log('awsServices: list called with year:', year);
    let allProviders: Provider[] = [];
    let nextToken: string | null | null = null;

    // Skip the providersByCompensationYear query since it's failing due to schema mismatch
    // and just use listProviders with client-side filtering
    console.log('awsServices: Using listProviders query with client-side filtering');
    
    // Use a simplified listProviders query
    const simplifiedListQuery = `
      query ListProviders($limit: Int, $nextToken: String) {
        listProviders(limit: $limit, nextToken: $nextToken) {
          items {
            id
            employeeId
            name
            providerType
            specialty
            subspecialty
            yearsExperience
            hourlyWage
            baseSalary
            originalAgreementDate
            organizationName
            organizationId
            startDate
            contractTerm
            ptoDays
            holidayDays
            cmeDays
            cmeAmount
            signingBonus
            qualityBonus
            educationBonus
            compensationType
            conversionFactor
            wRVUTarget
            compensationYear
            credentials
            administrativeFte
            templateTag
            dynamicFields
            createdAt
            updatedAt
            owner
          }
          nextToken
        }
      }
    `;
    
    do {
      try {
        const result: any = await client.graphql({
          query: simplifiedListQuery,
          variables: { limit: 1000, nextToken },
        });
        
        console.log('awsServices: listProviders result:', result);
        const providerData = result.data?.listProviders;
        if (providerData?.items) {
          const validItems = providerData.items.filter(Boolean);
          console.log('awsServices: Found', validItems.length, 'total providers');
          allProviders.push(...validItems);
        }
        nextToken = providerData?.nextToken;
      } catch (error) {
        console.error('awsServices: Error listing providers:', error);
        break;
      }
    } while (nextToken);
    
    // Filter by year on client side if year was specified
    if (year && allProviders.length > 0) {
      const filteredProviders = allProviders.filter(provider => 
        provider.compensationYear === year.toString()
      );
      console.log('awsServices: Filtered to', filteredProviders.length, 'providers for year', year);
      return filteredProviders;
    }
    
    console.log('awsServices: Returning', allProviders.length, 'total providers');
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
          query: createProvider, // Use standard mutation
              variables: { input: provider }
            });
            return (result as any).data?.createProvider || null;
          })
        );
        
        return results.filter((result): result is Provider => result !== null);
      } catch (error) {
        console.error('Error batch creating providers:', error);
        throw error;
      }
    });
  },
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

  async getMappingsByTemplateAndProvider(templateId: string, providerId: string): Promise<Mapping[]> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listMappings,
          variables: { 
            filter: { 
              templateID: { eq: templateId },
              providerID: { eq: providerId }
            },
            limit: 1000 
          }
        });
        
        return (result.data?.listMappings?.items || [])
          .filter((item): item is Mapping => item !== null);
      } catch (error) {
        console.error(`Error getting mappings for template ${templateId} and provider ${providerId}:`, error);
        throw error;
      }
    });
  },

  async batchCreate(mappings: CreateMappingInput[]): Promise<Mapping[]> {
    const tableName = import.meta.env.VITE_DYNAMODB_MAPPING_TABLE;

    const writeRequests = mappings.map(mapping => ({
      PutRequest: {
        Item: {
          id: mapping.id || crypto.randomUUID(),
          ...mapping,
          __typename: 'Mapping',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    // BatchWriteCommand can only handle 25 items at a time
    const batches = [];
    for (let i = 0; i < writeRequests.length; i += 25) {
      batches.push(writeRequests.slice(i, i + 25));
    }

    try {
      for (const batch of batches) {
        const params: BatchWriteCommandInput = {
          RequestItems: {
            [tableName]: batch,
          },
        };
        await withRetry(async () => docClient.send(new BatchWriteCommand(params)));
      }
      // Note: BatchWrite does not return the created items in the same way as single Put.
      // We return the input as a representation of what was created.
      return mappings as Mapping[];
    } catch (error: any) {
      console.error('Error batch creating mappings:', error);
      throw new AWSError('Failed to batch create mappings', error.name, error.$metadata?.httpStatusCode, isRetryableError(error));
    }
  },

  async deleteMappingsByTemplateAndProvider(templateId: string, providerId: string): Promise<void> {
    const tableName = import.meta.env.VITE_DYNAMODB_MAPPING_TABLE;
    // 1. Query for mappings to get their primary keys (id)
    const queryParams = {
        TableName: tableName,
        IndexName: 'byTemplateAndProvider',
        KeyConditionExpression: 'templateID = :templateId AND providerID = :providerId',
        ExpressionAttributeValues: {
            ':templateId': templateId,
            ':providerId': providerId,
        },
    };
    try {
        const queryResult = await withRetry(async () => docClient.send(new QueryCommand(queryParams)));
        const mappingsToDelete = queryResult.Items;
        if (!mappingsToDelete || mappingsToDelete.length === 0) {
            return; // Nothing to delete
        }
        // 2. Batch delete the mappings
        const deleteRequests = mappingsToDelete.map(mapping => ({
            DeleteRequest: {
                Key: { id: mapping.id },
            },
        }));
        const batches = [];
        for (let i = 0; i < deleteRequests.length; i += 25) {
            batches.push(deleteRequests.slice(i, i + 25));
        }
        for (const batch of batches) {
            const batchParams: BatchWriteCommandInput = {
                RequestItems: {
                    [tableName]: batch,
                },
            };
            await withRetry(async () => docClient.send(new BatchWriteCommand(batchParams)));
        }
    } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
            // Log and treat as no-op
            console.warn(`Mapping table or index not found for template ${templateId} and provider ${providerId}. Treating as no-op.`);
            // Audit log for missing resource
            try {
                const userEmail = (typeof window !== 'undefined' && localStorage.getItem('userEmail')) || 'unknown';
                const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || 'unknown';
                await awsAuditLogs.create({
                    action: 'DELETE_MAPPING',
                    user: userEmail,
                    timestamp: new Date().toISOString(),
                    details: JSON.stringify({
                        message: 'Mapping table or index not found (ResourceNotFoundException)',
                        templateId,
                        providerId,
                        status: 'not_found',
                        userId,
                    }),
                });
            } catch (auditError) {
                console.error('Failed to log ResourceNotFoundException to audit log:', auditError);
            }
            return;
        }
        console.error(`Error deleting mappings for template ${templateId} and provider ${providerId}:`, error);
        throw new AWSError('Failed to delete mappings', error.name, error.$metadata?.httpStatusCode, isRetryableError(error));
    }
  },

  // Enterprise utility: Delete all mappings for a template (regardless of provider)
  async deleteAllMappingsForTemplate(templateId: string): Promise<{ deletedCount: number, attemptedCount: number, templateId: string, status: string }> {
    const tableName = import.meta.env.VITE_DYNAMODB_MAPPING_TABLE;
    let deletedCount = 0;
    let attemptedCount = 0;
    let status = 'success';
    // 1. Query for all mappings for this template
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'templateID = :templateId',
      ExpressionAttributeValues: {
        ':templateId': templateId,
      },
    };
    let logDetails: any = {};
    try {
      const scanResult = await withRetry(async () => docClient.send(new ScanCommand(scanParams)));
      const mappingsToDelete = scanResult.Items;
      attemptedCount = mappingsToDelete?.length || 0;
      if (!mappingsToDelete || mappingsToDelete.length === 0) {
        status = 'not_found';
        logDetails = { message: 'No mappings found for template', templateId };
        return { deletedCount: 0, attemptedCount: 0, templateId, status };
      }
      // 2. Batch delete the mappings
      const deleteRequests = mappingsToDelete.map(mapping => ({
        DeleteRequest: {
          Key: { id: mapping.id },
        },
      }));
      const batches = [];
      for (let i = 0; i < deleteRequests.length; i += 25) {
        batches.push(deleteRequests.slice(i, i + 25));
      }
      for (const batch of batches) {
        const batchParams = {
          RequestItems: {
            [tableName]: batch,
          },
        };
        await withRetry(async () => docClient.send(new BatchWriteCommand(batchParams)));
        deletedCount += batch.length;
      }
      logDetails = { message: 'Mappings deleted', templateId, deletedCount, attemptedCount };
    } catch (error: any) {
      status = 'error';
      logDetails = { message: 'Error deleting mappings', templateId, error: error?.message || error };
      console.error(`Error deleting all mappings for template ${templateId}:`, error);
    } finally {
      // Audit log (always log the attempt)
      try {
        const userEmail = (typeof window !== 'undefined' && localStorage.getItem('userEmail')) || 'unknown';
        const userId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || 'unknown';
        await awsAuditLogs.create({
          action: 'DELETE_MAPPING',
          user: userEmail,
          timestamp: new Date().toISOString(),
          details: JSON.stringify({
            ...logDetails,
            deletedCount,
            attemptedCount,
            status,
            userId,
          }),
        });
      } catch (auditError) {
        // Do not throw if audit log fails
        console.error('Failed to log mapping deletion to audit log:', auditError);
      }
    }
    return { deletedCount, attemptedCount, templateId, status };
  },
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
  },

  async listAll(): Promise<ListClausesQuery['listClauses']['items']> {
    let allClauses: ListClausesQuery['listClauses']['items'] = [];
    let nextToken: string | undefined = undefined;
    let pageCount = 0;
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount} with nextToken:`, nextToken);
      const result = await this.list(100, nextToken);
      console.log(`Page ${pageCount} result:`, result);
      if (result?.items) {
        console.log(`Page ${pageCount} returned ${result.items.length} items`);
        allClauses = allClauses.concat(result.items);
      }
      nextToken = result?.nextToken;
      console.log(`Page ${pageCount} nextToken:`, nextToken);
    } while (nextToken);
    console.log(`Total clauses fetched: ${allClauses.length}`);
    return allClauses;
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

// Enhanced Template Mapping Operations (for template-level mappings)
export const awsTemplateMappings = {
  async create(input: CreateTemplateMappingInput): Promise<TemplateMapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: createTemplateMapping,
          variables: { input }
        });
        const mapping = result.data?.createTemplateMapping;
        if (mapping) {
          // Ensure organizationId is included in the response
          return {
            ...mapping,
            organizationId: (mapping as any).organizationId || input.organizationId
          } as TemplateMapping;
        }
        return null;
      } catch (error) {
        console.error('Error creating template mapping:', error);
        throw error;
      }
    });
  },

  async update(input: UpdateTemplateMappingInput): Promise<TemplateMapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: updateTemplateMapping,
          variables: { input }
        });
        const mapping = result.data?.updateTemplateMapping;
        if (mapping) {
          return {
            ...mapping,
            organizationId: (mapping as any).organizationId || input.organizationId
          } as TemplateMapping;
        }
        return null;
      } catch (error) {
        console.error('Error updating template mapping:', error);
        throw error;
      }
    });
  },

  async delete(input: DeleteTemplateMappingInput): Promise<TemplateMapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: deleteTemplateMapping,
          variables: { input }
        });
        const mapping = result.data?.deleteTemplateMapping;
        if (mapping) {
          return {
            ...mapping,
            organizationId: (mapping as any).organizationId || 'default'
          } as TemplateMapping;
        }
        return null;
      } catch (error) {
        console.error('Error deleting template mapping:', error);
        throw error;
      }
    });
  },

  async get(id: string): Promise<TemplateMapping | null> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: getTemplateMapping,
          variables: { id }
        });
        const mapping = result.data?.getTemplateMapping;
        if (mapping) {
          return {
            ...mapping,
            organizationId: (mapping as any).organizationId || 'default'
          } as TemplateMapping;
        }
        return null;
      } catch (error) {
        console.error('Error getting template mapping:', error);
        throw error;
      }
    });
  },

  async list(limit?: number, nextToken?: string): Promise<ListTemplateMappingsQuery['listTemplateMappings']> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listTemplateMappings,
          variables: { limit, nextToken }
        });
        return result.data?.listTemplateMappings || null;
      } catch (error) {
        console.error('Error listing template mappings:', error);
        throw error;
      }
    });
  },

  async getMappingsByTemplateId(templateId: string): Promise<TemplateMapping[]> {
    return withRetry(async () => {
      try {
        const result = await client.graphql({
          query: listTemplateMappings,
          variables: { 
            filter: { 
              templateID: { eq: templateId }
            },
            limit: 1000 
          }
        });
        
        return (result.data?.listTemplateMappings?.items || [])
          .filter((item): item is TemplateMapping => item !== null);
      } catch (error) {
        console.error(`Error getting template mappings for template ${templateId}:`, error);
        throw error;
      }
    });
  }
};

// Bulk Operations
export const awsBulkOperations = {
  async countAllProviders(): Promise<number> {
    console.log('[awsBulkOperations.countAllProviders] Counting providers via GraphQL API...');
    
    let totalCount = 0;
    let nextToken: string | undefined;
    let pageCount = 0;
    
    do {
      pageCount++;
      console.log(`[awsBulkOperations.countAllProviders] Counting page ${pageCount}...`);
      
      try {
        const result = await client.graphql({
          query: listProvidersCustom,
          variables: {
            limit: 1000, // Maximum limit
            nextToken
          }
        });
        
        const providers = (result as any).data.listProviders.items || [];
        totalCount += providers.length;
        nextToken = (result as any).data.listProviders.nextToken;
        
        console.log(`[awsBulkOperations.countAllProviders] Page ${pageCount}: Found ${providers.length} providers`);
      } catch (error) {
        console.error(`[awsBulkOperations.countAllProviders] Error counting page ${pageCount}:`, error);
        throw error;
      }
    } while (nextToken);

    console.log(`[awsBulkOperations.countAllProviders] Total providers found: ${totalCount}`);
    return totalCount;
  },

  async deleteAllProviders(onProgress?: (progress: { deleted: number; total: number }) => void): Promise<void> {
    console.log('[awsBulkOperations.deleteAllProviders] Starting deletion via GraphQL API...');
    
    // 1. Get all providers via GraphQL (respects authorization rules)
    let allProviders: Provider[] = [];
    let nextToken: string | undefined;
    let pageCount = 0;
    
    do {
      pageCount++;
      console.log(`[awsBulkOperations.deleteAllProviders] Fetching page ${pageCount}...`);
      
      try {
        const result = await client.graphql({
          query: `
            query ListProvidersForDelete($limit: Int, $nextToken: String) {
              listProviders(limit: $limit, nextToken: $nextToken) {
                items {
                  id
                  employeeId
                  name
                  providerType
                  specialty
                  subspecialty
                  yearsExperience
                  hourlyWage
                  baseSalary
                  originalAgreementDate
                  organizationName
                  organizationId
                  startDate
                  contractTerm
                  ptoDays
                  holidayDays
                  cmeDays
                  cmeAmount
                  signingBonus
                  qualityBonus
                  educationBonus
                  compensationType
                  conversionFactor
                  wRVUTarget
                  compensationYear
                  credentials
                  administrativeFte
                  templateTag
                  dynamicFields
                  createdAt
                  updatedAt
                  owner
                }
                nextToken
              }
            }
          `,
          variables: {
            limit: 1000, // Maximum limit
            nextToken
          }
        });
        
        const providers = (result as any).data.listProviders.items || [];
        allProviders.push(...providers);
        nextToken = (result as any).data.listProviders.nextToken;
        
        console.log(`[awsBulkOperations.deleteAllProviders] Page ${pageCount}: Found ${providers.length} providers`);
      } catch (error) {
        console.error(`[awsBulkOperations.deleteAllProviders] Error fetching page ${pageCount}:`, error);
        throw error;
      }
    } while (nextToken);

    const total = allProviders.length;
    console.log(`[awsBulkOperations.deleteAllProviders] Total providers found: ${total}`);
    
    if (total === 0) {
      onProgress?.({ deleted: 0, total });
      console.log('[awsBulkOperations.deleteAllProviders] No providers to delete');
      return;
    }

    // 2. Delete providers in batches via GraphQL
    const batchSize = 25; // Reasonable batch size for GraphQL
    let deletedCount = 0;
    onProgress?.({ deleted: 0, total });

    for (let i = 0; i < total; i += batchSize) {
      const batch = allProviders.slice(i, i + batchSize);
      console.log(`[awsBulkOperations.deleteAllProviders] Deleting batch ${Math.floor(i/batchSize) + 1}, providers ${i+1}-${Math.min(i+batchSize, total)}`);
      
      // Delete providers in parallel within the batch
      const deletePromises = batch.map(async (provider) => {
        try {
          // Use a simplified delete mutation that only requests existing fields
          const simplifiedDeleteMutation = `
            mutation DeleteProvider($input: DeleteProviderInput!) {
              deleteProvider(input: $input) {
                id
                employeeId
                name
                providerType
                specialty
                subspecialty
                yearsExperience
                hourlyWage
                baseSalary
                originalAgreementDate
                organizationName
                organizationId
                startDate
                contractTerm
                ptoDays
                holidayDays
                cmeDays
                cmeAmount
                signingBonus
                qualityBonus
                educationBonus
                compensationType
                conversionFactor
                wRVUTarget
                compensationYear
                credentials
                administrativeFte
                templateTag
                dynamicFields
                createdAt
                updatedAt
                owner
              }
            }
          `;
          
          await client.graphql({
            query: simplifiedDeleteMutation,
            variables: {
              input: { id: provider.id }
            }
          });
          return true;
        } catch (error) {
          console.error(`[awsBulkOperations.deleteAllProviders] Failed to delete provider ${provider.id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(deletePromises);
      const successfulDeletes = results.filter(result => result.status === 'fulfilled' && result.value).length;
      deletedCount += successfulDeletes;
      
      onProgress?.({ deleted: deletedCount, total });
      console.log(`[awsBulkOperations.deleteAllProviders] Batch ${Math.floor(i/batchSize) + 1} complete: ${successfulDeletes}/${batch.length} deleted`);
    }
    
    console.log(`[awsBulkOperations.deleteAllProviders] Deletion complete. Deleted: ${deletedCount}, Total found: ${total}`);
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
      console.log(`[awsBulkOperations.createProviders] Processing batch ${Math.floor(i/batchSize) + 1}, providers ${i+1}-${Math.min(i+batchSize, total)}`);
      
      const results = await Promise.allSettled(
        batch.map(async (provider, idx) => {
          try {
            console.log(`[awsBulkOperations.createProviders] Creating provider ${i + idx + 1}:`, provider);
            const created = await awsProviders.create(provider);
            if (created) successfulProviders.push(created);
          } catch (err) {
            console.error(`[awsBulkOperations.createProviders] Failed to create provider ${i + idx + 1}:`, err);
            console.error('[awsBulkOperations.createProviders] Failed provider data:', provider);
            // Print the full error object for debugging
            console.error('Full error object:', JSON.stringify(err, null, 2));
          }
        })
      );
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
    await awsProviders.list();
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