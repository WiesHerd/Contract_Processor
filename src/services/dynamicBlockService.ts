import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { 
  createDynamicBlock as createDynamicBlockMutation,
  updateDynamicBlock as updateDynamicBlockMutation,
  deleteDynamicBlock as deleteDynamicBlockMutation
} from '@/graphql/mutations';
import {
  getDynamicBlock as getDynamicBlockQuery,
  listDynamicBlocks as listDynamicBlocksQuery
} from '@/graphql/queries';

const client = generateClient();

export interface DynamicBlockData {
  id?: string;
  name: string;
  description?: string;
  placeholder: string;
  outputType: string;
  format: string;
  conditions: any[];
  alwaysInclude: any[];
}

export interface DynamicBlockResponse {
  id: string;
  name: string;
  description?: string;
  placeholder: string;
  outputType: string;
  format: string;
  conditions: any[];
  alwaysInclude: any[];
  createdAt?: string;
  updatedAt?: string;
  owner?: string;
}

export class DynamicBlockService {
  static async createDynamicBlock(blockData: DynamicBlockData): Promise<DynamicBlockResponse> {
    try {
      // Get current user for owner field
      const currentUser = await getCurrentUser();
      
      const input = {
        name: blockData.name,
        description: blockData.description || '',
        placeholder: blockData.placeholder,
        outputType: blockData.outputType,
        format: blockData.format,
        conditions: JSON.stringify(blockData.conditions),
        alwaysInclude: JSON.stringify(blockData.alwaysInclude),
        owner: currentUser.username, // Use username for consistency
      };

      console.log('🔄 Creating dynamic block with input:', input);
      const result = await client.graphql({ query: createDynamicBlockMutation, variables: { input } }) as GraphQLResult<any>;
      
      if (result.errors) {
        console.error('❌ GraphQL errors:', result.errors);
        throw new Error(result.errors[0].message);
      }

      const savedBlock = result.data.createDynamicBlock;
      console.log('✅ Dynamic block created successfully:', savedBlock);
      return {
        ...savedBlock,
        conditions: JSON.parse(savedBlock.conditions || '[]'),
        alwaysInclude: JSON.parse(savedBlock.alwaysInclude || '[]'),
      };
    } catch (error) {
      console.error('❌ Error creating dynamic block:', error);
      throw error;
    }
  }

  static async updateDynamicBlock(blockData: DynamicBlockData): Promise<DynamicBlockResponse> {
    try {
      console.log('🔄 Updating dynamic block with input:', blockData);
      
      // Validate that ID exists for update
      if (!blockData.id) {
        throw new Error('Block ID is required for update. Use createDynamicBlock for new blocks.');
      }
      
      // Get current user
      const currentUser = await getCurrentUser();
      console.log('👤 Current user:', currentUser.username);
      
      // Check if the block exists and verify ownership
      try {
        const existingBlock = await client.graphql({
          query: getDynamicBlockQuery,
          variables: { id: blockData.id }
        });
        
        console.log('📋 Existing block:', existingBlock.data.getDynamicBlock);
        
        if (!existingBlock.data.getDynamicBlock) {
          throw new Error(`Dynamic block with ID "${blockData.id}" not found. It may have been deleted or you may not have permission to access it.`);
        }
        
        const blockOwner = existingBlock.data.getDynamicBlock.owner;
        console.log('🔍 Block owner:', blockOwner);
        console.log('👤 Current user username:', currentUser.username);
        console.log('👤 Current user userId:', currentUser.userId);
        
        // Check ownership against both username and userId for flexibility
        const isOwner = blockOwner === currentUser.username || blockOwner === currentUser.userId;
        
        if (!isOwner) {
          console.error('❌ Ownership check failed:');
          console.error('  Block owner:', blockOwner);
          console.error('  Current username:', currentUser.username);
          console.error('  Current userId:', currentUser.userId);
          throw new Error('You are not authorized to update this dynamic block. Only the owner can make changes.');
        }
        
        console.log('✅ Ownership verified successfully');
      } catch (error) {
        console.error('❌ Error checking existing block:', error);
        // Re-throw the error with more context
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to verify block ownership');
      }
      
      const input = {
        id: blockData.id, // Now guaranteed to be a string
        name: blockData.name,
        description: blockData.description,
        placeholder: blockData.placeholder,
        outputType: blockData.outputType,
        format: blockData.format,
        conditions: JSON.stringify(blockData.conditions),
        alwaysInclude: JSON.stringify(blockData.alwaysInclude),
        owner: currentUser.username
      };
      
      console.log('📝 Update input:', input);
      
      const result = await client.graphql({
        query: updateDynamicBlockMutation,
        variables: { input }
      });
      
      console.log('✅ Update result:', result);
      
      if (!result.data.updateDynamicBlock) {
        throw new Error('Failed to update dynamic block');
      }
      
      const updatedBlock = result.data.updateDynamicBlock;
      
      return {
        id: updatedBlock.id,
        name: updatedBlock.name,
        description: updatedBlock.description || '',
        placeholder: updatedBlock.placeholder,
        outputType: updatedBlock.outputType,
        format: updatedBlock.format,
        conditions: updatedBlock.conditions ? JSON.parse(updatedBlock.conditions) : [],
        alwaysInclude: updatedBlock.alwaysInclude ? JSON.parse(updatedBlock.alwaysInclude) : [],
      };
    } catch (error) {
      console.error('❌ Error updating dynamic block:', error);
      throw error;
    }
  }

  static async deleteDynamicBlock(id: string): Promise<void> {
    try {
      console.log('🔄 Deleting dynamic block with ID:', id);
      const result = await client.graphql({ query: deleteDynamicBlockMutation, variables: { input: { id } } }) as GraphQLResult<any>;
      
      if (result.errors) {
        console.error('❌ GraphQL errors:', result.errors);
        throw new Error(result.errors[0].message);
      }

      console.log('✅ Dynamic block deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting dynamic block:', error);
      throw error;
    }
  }

  static async getDynamicBlock(id: string): Promise<DynamicBlockResponse> {
    try {
      console.log('🔄 Getting dynamic block with ID:', id);
      const result = await client.graphql({ query: getDynamicBlockQuery, variables: { id } }) as GraphQLResult<any>;
      
      if (result.errors) {
        console.error('❌ GraphQL errors:', result.errors);
        throw new Error(result.errors[0].message);
      }

      const block = result.data.getDynamicBlock;
      console.log('✅ Dynamic block retrieved successfully:', block);
      return {
        ...block,
        conditions: JSON.parse(block.conditions || '[]'),
        alwaysInclude: JSON.parse(block.alwaysInclude || '[]'),
      };
    } catch (error) {
      console.error('❌ Error getting dynamic block:', error);
      throw error;
    }
  }

  static async listDynamicBlocks(): Promise<DynamicBlockResponse[]> {
    try {
      console.log('🔄 Listing dynamic blocks...');
      const result = await client.graphql({ query: listDynamicBlocksQuery }) as GraphQLResult<any>;
      
      if (result.errors) {
        console.error('❌ GraphQL errors:', result.errors);
        throw new Error(result.errors[0].message);
      }

      const blocks = result.data.listDynamicBlocks.items || [];
      console.log('✅ Listed dynamic blocks successfully:', blocks.length, 'blocks found');
      return blocks.map((block: any) => ({
        ...block,
        conditions: JSON.parse(block.conditions || '[]'),
        alwaysInclude: JSON.parse(block.alwaysInclude || '[]'),
      }));
    } catch (error) {
      console.error('❌ Error listing dynamic blocks:', error);
      throw error;
    }
  }
} 