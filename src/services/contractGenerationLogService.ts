import { generateClient } from 'aws-amplify/api';
import { createContractGenerationLog, updateContractGenerationLog, deleteContractGenerationLog } from '../graphql/mutations';
import { getContractGenerationLog, listContractGenerationLogs } from '../graphql/queries';

const client = generateClient();

export interface ContractGenerationLog {
  id: string;
  providerId: string;
  contractYear: string;
  templateId: string;
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
  generatedAt: string;
  generatedBy?: string;
  outputType?: string;
  status?: string;
  fileUrl?: string;
  notes?: string;
}

export interface ContractGenerationLogConnection {
  items: ContractGenerationLog[];
  nextToken?: string;
}

export class ContractGenerationLogService {
  static async createLog(input: CreateContractGenerationLogInput): Promise<ContractGenerationLog> {
    try {
      const result = await client.graphql({
        query: createContractGenerationLog,
        variables: { input }
      });
      return (result as any).data.createContractGenerationLog;
    } catch (error) {
      console.error('Error creating contract generation log:', error);
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