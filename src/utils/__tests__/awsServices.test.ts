import { describe, it, expect, vi, beforeEach } from 'vitest';
import { awsTemplates, awsProviders, awsMappings, checkAWSHealth } from '../awsServices';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';

// Mock the generateClient function from aws-amplify/api
vi.mock('aws-amplify/api', () => {
  const mockGraphQLClient = {
    graphql: vi.fn()
  };
  return {
    generateClient: vi.fn(() => mockGraphQLClient)
  };
});

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb');

// Mock the amplify configuration
vi.mock('../amplifyconfiguration.json', () => ({
  default: {
    aws_project_region: 'us-east-2',
    aws_user_files_s3_bucket: 'test-bucket',
    aws_cognito_identity_pool_id: 'test-pool-id'
  }
}));

// Get the mocked client for test setup
const mockGraphQLClient = {
  graphql: vi.fn()
};


describe('AWS Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock GraphQL client
    mockGraphQLClient.graphql.mockReset();
  });

  describe('awsTemplates', () => {
    it('should create a template successfully', async () => {
      const mockTemplate: Template = {
        id: 'test-id',
        name: 'Test Template',
        description: 'Test description',
        version: '1.0.0',
        compensationModel: 'BASE',
        tags: [],
        clauses: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        },
        placeholders: ['ProviderName', 'StartDate'],
        clauseIds: [],
        versionHistory: [],
      };

      // Mock successful GraphQL response
      mockGraphQLClient.graphql.mockResolvedValue({
        data: {
          createTemplate: {
            id: 'test-id',
            name: 'Test Template',
            description: 'Test description',
            version: '1.0.0',
            s3Key: 'test-key',
            type: 'BASE'
          }
        }
      });

      const result = await awsTemplates.create({
        id: mockTemplate.id,
        name: mockTemplate.name,
        description: mockTemplate.description,
        version: mockTemplate.version,
        s3Key: 'test-key',
        type: mockTemplate.compensationModel,
      });

      expect(result).toBeDefined();
      expect(mockGraphQLClient.graphql).toHaveBeenCalled();
    });

    it('should handle template creation errors', async () => {
      // Mock error
      mockGraphQLClient.graphql.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(awsTemplates.create({
        id: 'test-id',
        name: 'Test Template',
        s3Key: 'test-key',
        type: 'BASE',
      })).rejects.toThrow('Creation failed');
    });
  });

  describe('awsProviders', () => {
    it('should create a provider successfully', async () => {
      const mockProvider: Provider = {
        id: 'test-provider-id',
        name: 'Dr. John Doe',
        startDate: '2024-01-01',
        fte: 0.8,
        baseSalary: 250000,
        compensationModel: 'BASE',
        specialty: 'Cardiology',
        fteBreakdown: [
          { activity: 'Clinical', percentage: 80 },
          { activity: 'Administrative', percentage: 20 },
        ],
      };

      // Mock successful GraphQL response
      mockGraphQLClient.graphql.mockResolvedValue({
        data: {
          createProvider: {
            id: 'test-provider-id',
            name: 'Dr. John Doe',
            specialty: 'Cardiology',
            fte: 0.8,
            baseSalary: 250000,
            startDate: '2024-01-01',
            contractTerm: '2 years'
          }
        }
      });

      const result = await awsProviders.create({
        name: mockProvider.name,
        specialty: mockProvider.specialty,
        fte: mockProvider.fte,
        baseSalary: mockProvider.baseSalary,
        startDate: mockProvider.startDate,
        contractTerm: '2 years',
      });

      expect(result).toBeDefined();
      expect(mockGraphQLClient.graphql).toHaveBeenCalled();
    });

    it('should handle bulk provider creation', async () => {
      const providers = Array.from({ length: 5 }, (_, i) => ({
        name: `Provider ${i + 1}`,
        specialty: 'Cardiology',
        fte: 0.8,
        baseSalary: 250000,
        startDate: '2024-01-01',
        contractTerm: '2 years',
      }));

      // Mock successful GraphQL responses for each provider
      mockGraphQLClient.graphql.mockResolvedValue({
        data: {
          createProvider: {
            id: 'test-provider-id',
            name: 'Provider 1',
            specialty: 'Cardiology',
            fte: 0.8,
            baseSalary: 250000,
            startDate: '2024-01-01',
            contractTerm: '2 years'
          }
        }
      });

      const results = await awsProviders.batchCreate(providers);
      expect(results).toHaveLength(5);
    });
  });

  describe('awsMappings', () => {
    it('should create mappings successfully', async () => {
      const mappingInput = {
        templateID: 'template-id',
        providerID: 'provider-id',
        field: 'ProviderName',
        value: 'Dr. John Doe'
      };

      // Mock successful GraphQL response
      mockGraphQLClient.graphql.mockResolvedValue({
        data: {
          createMapping: {
            id: 'mapping-id',
            templateID: 'template-id',
            providerID: 'provider-id',
            field: 'ProviderName',
            value: 'Dr. John Doe'
          }
        }
      });

      const result = await awsMappings.create(mappingInput);

      expect(result).toBeDefined();
      expect(mockGraphQLClient.graphql).toHaveBeenCalled();
    });

    it('should query mappings by template and provider', async () => {
      // Mock successful GraphQL response
      mockGraphQLClient.graphql.mockResolvedValue({
        data: {
          listMappings: {
            items: [
              {
                id: 'mapping-id',
                templateID: 'template-id',
                providerID: 'provider-id',
                field: 'ProviderName',
                value: 'Dr. John Doe'
              }
            ]
          }
        }
      });

      const result = await awsMappings.getMappingsByTemplateAndProvider('template-id', 'provider-id');

      expect(result).toBeDefined();
      expect(mockGraphQLClient.graphql).toHaveBeenCalled();
    });
  });

  describe('checkAWSHealth', () => {
    it('should return health status for all services', async () => {
      const health = await checkAWSHealth();

      expect(health).toHaveProperty('dynamodb');
      expect(health).toHaveProperty('s3');
      expect(health).toHaveProperty('appsync');
      expect(typeof health.dynamodb).toBe('boolean');
      expect(typeof health.s3).toBe('boolean');
      expect(typeof health.appsync).toBe('boolean');
    });
  });
}); 