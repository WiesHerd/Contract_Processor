import { generateClient } from 'aws-amplify/api';
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

const client = generateClient();

// Template Operations
export const awsTemplates = {
  async create(input: CreateTemplateInput): Promise<Template | null> {
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
  },

  async update(input: UpdateTemplateInput): Promise<Template | null> {
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
  },

  async delete(input: DeleteTemplateInput): Promise<Template | null> {
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
  },

  async get(id: string): Promise<Template | null> {
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
  },

  async list(limit?: number, nextToken?: string): Promise<ListTemplatesQuery['listTemplates']> {
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
  }
};

// Provider Operations
export const awsProviders = {
  async create(input: CreateProviderInput): Promise<Provider | null> {
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
  },

  async update(input: UpdateProviderInput): Promise<Provider | null> {
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
  },

  async delete(input: DeleteProviderInput): Promise<Provider | null> {
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
  },

  async get(id: string): Promise<Provider | null> {
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
  },

  async list(limit?: number, nextToken?: string): Promise<ListProvidersQuery['listProviders']> {
    try {
      const result = await client.graphql({
        query: listProviders,
        variables: { limit, nextToken }
      });
      return result.data?.listProviders || null;
    } catch (error) {
      console.error('Error listing providers:', error);
      throw error;
    }
  }
};

// Mapping Operations
export const awsMappings = {
  async create(input: CreateMappingInput): Promise<Mapping | null> {
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
  },

  async update(input: UpdateMappingInput): Promise<Mapping | null> {
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
  },

  async delete(input: DeleteMappingInput): Promise<Mapping | null> {
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
  },

  async get(id: string): Promise<Mapping | null> {
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
  },

  async list(limit?: number, nextToken?: string): Promise<ListMappingsQuery['listMappings']> {
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
  }
};

// Clause Operations
export const awsClauses = {
  async create(input: CreateClauseInput): Promise<Clause | null> {
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
  },

  async update(input: UpdateClauseInput): Promise<Clause | null> {
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
  },

  async delete(input: DeleteClauseInput): Promise<Clause | null> {
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
  },

  async get(id: string): Promise<Clause | null> {
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
  },

  async list(limit?: number, nextToken?: string): Promise<ListClausesQuery['listClauses']> {
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
  }
};

// Audit Log Operations
export const awsAuditLogs = {
  async create(input: CreateAuditLogInput): Promise<AuditLog | null> {
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
  },

  async update(input: UpdateAuditLogInput): Promise<AuditLog | null> {
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
  },

  async delete(input: DeleteAuditLogInput): Promise<AuditLog | null> {
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
  },

  async get(id: string): Promise<AuditLog | null> {
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
  },

  async list(limit?: number, nextToken?: string): Promise<ListAuditLogsQuery['listAuditLogs']> {
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
  }
};

// Bulk Operations
export const awsBulkOperations = {
  async createProviders(providers: CreateProviderInput[]): Promise<Provider[]> {
    const results = await Promise.allSettled(
      providers.map(provider => awsProviders.create(provider))
    );
    
    const successful = results
      .filter((result): result is PromiseFulfilledResult<Provider | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
    
    const failed = results
      .filter((result): result is PromiseRejectedResult => 
        result.status === 'rejected'
      );
    
    if (failed.length > 0) {
      console.warn(`${failed.length} providers failed to create:`, failed);
    }
    
    return successful;
  },

  async deleteAllProviders(): Promise<void> {
    try {
      const providers = await awsProviders.list(1000);
      if (providers?.items) {
        await Promise.allSettled(
          providers.items
            .filter((provider): provider is Provider => provider !== null)
            .map(provider => awsProviders.delete({ id: provider.id }))
        );
      }
    } catch (error) {
      console.error('Error deleting all providers:', error);
      throw error;
    }
  }
}; 