import { generateClient } from 'aws-amplify/api';
import { createContractGenerationLog, updateContractGenerationLog, deleteContractGenerationLog } from '../graphql/mutations';
import { getContractGenerationLog, listContractGenerationLogs } from '../graphql/queries';

const client = generateClient();

export interface ContractGenerationLog {
  id: string;
  providerId: string;
  contractYear: string;
  templateId: string;
  organizationId: string;
  generatedAt: string;
  generatedBy?: string;
  outputType?: string;
  status?: string;
  fileUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContractGenerationLogInput {
  providerId: string;
  contractYear: string;
  templateId: string;
  organizationId: string;
  generatedAt: string;
  generatedBy?: string;
  outputType?: string;
  status?: string;
  fileUrl?: string;
  notes?: string;
  owner?: string;
}

export interface ContractGenerationLogConnection {
  items: ContractGenerationLog[];
  nextToken?: string;
}

export class ContractGenerationLogService {
  static async createLog(input: CreateContractGenerationLogInput): Promise<ContractGenerationLog> {
    try {
      console.log('🔍 Creating contract log with input:', JSON.stringify(input, null, 2));
      const result = await client.graphql({
        query: createContractGenerationLog,
        variables: { input }
      });
      console.log('✅ Contract log created successfully:', result);
      return (result as any).data.createContractGenerationLog;
    } catch (error) {
      console.error('❌ Error creating contract generation log:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  static async listLogs(filter?: any, limit?: number, nextToken?: string): Promise<ContractGenerationLogConnection> {
    try {
      const result = await client.graphql({
        query: listContractGenerationLogs,
        variables: { filter, limit, nextToken }
      });
      return (result as any).data.listContractGenerationLogs;
    } catch (error) {
      console.error('Error listing contract generation logs:', error);
      throw error;
    }
  }

  static async getLog(id: string): Promise<ContractGenerationLog> {
    try {
      const result = await client.graphql({
        query: getContractGenerationLog,
        variables: { id }
      });
      return (result as any).data.getContractGenerationLog;
    } catch (error) {
      console.error('Error getting contract generation log:', error);
      throw error;
    }
  }

  static async deleteLog(id: string): Promise<ContractGenerationLog> {
    try {
      const result = await client.graphql({
        query: deleteContractGenerationLog,
        variables: { input: { id } }
      });
      return (result as any).data.deleteContractGenerationLog;
    } catch (error) {
      console.error('Error deleting contract generation log:', error);
      throw error;
    }
  }

  static async updateLog(id: string, input: Partial<ContractGenerationLog>): Promise<ContractGenerationLog> {
    try {
      const result = await client.graphql({
        query: updateContractGenerationLog,
        variables: { input: { id, ...input } }
      });
      return (result as any).data.updateContractGenerationLog;
    } catch (error) {
      console.error('Error updating contract generation log:', error);
      throw error;
    }
  }

  static async getLogsByProvider(providerId: string): Promise<ContractGenerationLog[]> {
    try {
      const result = await this.listLogs({ providerId: { eq: providerId } });
      return result.items;
    } catch (error) {
      console.error('Error getting logs by provider:', error);
      throw error;
    }
  }

  static async getLogsByContractYear(contractYear: string): Promise<ContractGenerationLog[]> {
    try {
      const result = await this.listLogs({ contractYear: { eq: contractYear } });
      return result.items;
    } catch (error) {
      console.error('Error getting logs by contract year:', error);
      throw error;
    }
  }
} 