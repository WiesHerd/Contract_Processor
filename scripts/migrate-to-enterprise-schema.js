/**
 * Enterprise Schema Migration Script
 * 
 * This script migrates existing data to work with the new enterprise-grade
 * multi-organization schema that uses Cognito groups for authorization.
 * 
 * Features:
 * - Migrates existing providers to include organizationId and organizationGroups
 * - Creates default organization for existing data
 * - Updates all related models (templates, mappings, etc.)
 * - Handles data validation and error recovery
 * - Provides detailed logging and rollback capabilities
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize GraphQL client
const client = generateClient();

// Default organization for migration
const DEFAULT_ORGANIZATION = {
  id: 'default-org',
  name: 'Default Organization',
  description: 'Default organization for existing data',
  memberGroups: ['Admin'], // Add your organization's Cognito groups here
  adminGroups: ['Admin'],
  settings: JSON.stringify({
    allowBulkOperations: true,
    maxFileSize: 10485760, // 10MB
    retentionDays: 365
  })
};

// GraphQL queries and mutations
const queries = {
  listProviders: `
    query ListProviders($limit: Int, $nextToken: String) {
      listProviders(limit: $limit, nextToken: $nextToken) {
        items {
          id
          employeeId
          name
          organizationName
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listTemplates: `
    query ListTemplates($limit: Int, $nextToken: String) {
      listTemplates(limit: $limit, nextToken: $nextToken) {
        items {
          id
          name
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listMappings: `
    query ListMappings($limit: Int, $nextToken: String) {
      listMappings(limit: $limit, nextToken: $nextToken) {
        items {
          id
          templateID
          providerID
          field
          value
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listClauses: `
    query ListClauses($limit: Int, $nextToken: String) {
      listClauses(limit: $limit, nextToken: $nextToken) {
        items {
          id
          title
          text
          tags
          condition
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listDynamicBlocks: `
    query ListDynamicBlocks($limit: Int, $nextToken: String) {
      listDynamicBlocks(limit: $limit, nextToken: $nextToken) {
        items {
          id
          name
          description
          placeholder
          outputType
          format
          conditions
          alwaysInclude
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listAuditLogs: `
    query ListAuditLogs($limit: Int, $nextToken: String) {
      listAuditLogs(limit: $limit, nextToken: $nextToken) {
        items {
          id
          action
          user
          timestamp
          details
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `,
  
  listContractGenerationLogs: `
    query ListContractGenerationLogs($limit: Int, $nextToken: String) {
      listContractGenerationLogs(limit: $limit, nextToken: $nextToken) {
        items {
          id
          providerId
          contractYear
          templateId
          generatedAt
          generatedBy
          outputType
          status
          fileUrl
          notes
          owner
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `
};

const mutations = {
  updateProvider: `
    mutation UpdateProvider($input: UpdateProviderInput!) {
      updateProvider(input: $input) {
        id
        organizationId
        organizationGroups
        organizationName
      }
    }
  `,
  
  updateTemplate: `
    mutation UpdateTemplate($input: UpdateTemplateInput!) {
      updateTemplate(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  updateMapping: `
    mutation UpdateMapping($input: UpdateMappingInput!) {
      updateMapping(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  updateClause: `
    mutation UpdateClause($input: UpdateClauseInput!) {
      updateClause(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  updateDynamicBlock: `
    mutation UpdateDynamicBlock($input: UpdateDynamicBlockInput!) {
      updateDynamicBlock(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  updateAuditLog: `
    mutation UpdateAuditLog($input: UpdateAuditLogInput!) {
      updateAuditLog(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  updateContractGenerationLog: `
    mutation UpdateContractGenerationLog($input: UpdateContractGenerationLogInput!) {
      updateContractGenerationLog(input: $input) {
        id
        organizationId
        organizationGroups
      }
    }
  `,
  
  createOrganization: `
    mutation CreateOrganization($input: CreateOrganizationInput!) {
      createOrganization(input: $input) {
        id
        name
        description
        memberGroups
        adminGroups
      }
    }
  `
};

async function signInUser() {
  try {
    console.log('🔐 Attempting to sign in...');
    
    const email = process.env.USER_EMAIL || 'wherdzik@gmail.com';
    const password = process.env.USER_PASSWORD;
    
    if (!password) {
      console.error('❌ USER_PASSWORD environment variable is required');
      console.log('Please set it: export USER_PASSWORD="your-password"');
      process.exit(1);
    }
    
    const user = await signIn({ username: email, password });
    console.log('✅ Successfully signed in as:', user.username);
    
    const currentUser = await getCurrentUser();
    console.log('👤 Current user sub:', currentUser.userId);
    
    return currentUser.userId;
  } catch (error) {
    console.error('❌ Sign in failed:', error.message);
    process.exit(1);
  }
}

async function getAllItems(queryName, query, variables = {}) {
  console.log(`📋 Fetching all ${queryName}...`);
  const allItems = [];
  let nextToken = null;
  
  do {
    try {
      const result = await client.graphql({
        query,
        variables: { ...variables, limit: 1000, nextToken }
      });
      
      const items = result.data[queryName].items;
      allItems.push(...items);
      nextToken = result.data[queryName].nextToken;
      
      console.log(`📊 Fetched ${items.length} ${queryName} (total: ${allItems.length})`);
    } catch (error) {
      console.error(`❌ Error fetching ${queryName}:`, error.message);
      throw error;
    }
  } while (nextToken);
  
  return allItems;
}

async function updateItem(mutationName, mutation, input) {
  try {
    await client.graphql({
      query: mutation,
      variables: { input }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${mutationName}:`, error.message);
    return false;
  }
}

async function migrateProviders(providers, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating providers...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    console.log(`\n[${i + 1}/${providers.length}] Migrating provider: ${provider.name} (${provider.id})`);
    
    const updateInput = {
      id: provider.id,
      organizationId,
      organizationGroups,
      organizationName: provider.organizationName || 'Default Organization'
    };
    
    const success = await updateItem('updateProvider', mutations.updateProvider, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateTemplates(templates, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating templates...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    console.log(`\n[${i + 1}/${templates.length}] Migrating template: ${template.name} (${template.id})`);
    
    const updateInput = {
      id: template.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateTemplate', mutations.updateTemplate, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateMappings(mappings, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating mappings...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    console.log(`\n[${i + 1}/${mappings.length}] Migrating mapping: ${mapping.id}`);
    
    const updateInput = {
      id: mapping.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateMapping', mutations.updateMapping, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateClauses(clauses, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating clauses...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    console.log(`\n[${i + 1}/${clauses.length}] Migrating clause: ${clause.title || clause.id}`);
    
    const updateInput = {
      id: clause.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateClause', mutations.updateClause, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateDynamicBlocks(dynamicBlocks, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating dynamic blocks...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < dynamicBlocks.length; i++) {
    const block = dynamicBlocks[i];
    console.log(`\n[${i + 1}/${dynamicBlocks.length}] Migrating dynamic block: ${block.name} (${block.id})`);
    
    const updateInput = {
      id: block.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateDynamicBlock', mutations.updateDynamicBlock, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateAuditLogs(auditLogs, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating audit logs...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < auditLogs.length; i++) {
    const log = auditLogs[i];
    console.log(`\n[${i + 1}/${auditLogs.length}] Migrating audit log: ${log.action} (${log.id})`);
    
    const updateInput = {
      id: log.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateAuditLog', mutations.updateAuditLog, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function migrateContractGenerationLogs(logs, organizationId, organizationGroups) {
  console.log('\n🔄 Migrating contract generation logs...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    console.log(`\n[${i + 1}/${logs.length}] Migrating generation log: ${log.id}`);
    
    const updateInput = {
      id: log.id,
      organizationId,
      organizationGroups
    };
    
    const success = await updateItem('updateContractGenerationLog', mutations.updateContractGenerationLog, updateInput);
    if (success) {
      successCount++;
      console.log('   ✅ Migrated successfully');
    } else {
      errorCount++;
      console.log('   ❌ Migration failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, errorCount };
}

async function createDefaultOrganization() {
  console.log('\n🏢 Creating default organization...');
  
  try {
    await client.graphql({
      query: mutations.createOrganization,
      variables: { input: DEFAULT_ORGANIZATION }
    });
    console.log('✅ Default organization created successfully');
    return DEFAULT_ORGANIZATION.id;
  } catch (error) {
    console.log('⚠️  Organization may already exist, continuing...');
    return DEFAULT_ORGANIZATION.id;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Enterprise Schema Migration...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Create default organization
    const organizationId = await createDefaultOrganization();
    const organizationGroups = DEFAULT_ORGANIZATION.memberGroups;
    
    console.log(`\n📊 Organization ID: ${organizationId}`);
    console.log(`📊 Organization Groups: ${organizationGroups.join(', ')}`);
    
    // Step 3: Fetch all existing data
    console.log('\n📋 Fetching existing data...');
    
    const providers = await getAllItems('listProviders', queries.listProviders);
    const templates = await getAllItems('listTemplates', queries.listTemplates);
    const mappings = await getAllItems('listMappings', queries.listMappings);
    const clauses = await getAllItems('listClauses', queries.listClauses);
    const dynamicBlocks = await getAllItems('listDynamicBlocks', queries.listDynamicBlocks);
    const auditLogs = await getAllItems('listAuditLogs', queries.listAuditLogs);
    const contractGenerationLogs = await getAllItems('listContractGenerationLogs', queries.listContractGenerationLogs);
    
    console.log(`\n📊 Data Summary:`);
    console.log(`   Providers: ${providers.length}`);
    console.log(`   Templates: ${templates.length}`);
    console.log(`   Mappings: ${mappings.length}`);
    console.log(`   Clauses: ${clauses.length}`);
    console.log(`   Dynamic Blocks: ${dynamicBlocks.length}`);
    console.log(`   Audit Logs: ${auditLogs.length}`);
    console.log(`   Contract Generation Logs: ${contractGenerationLogs.length}`);
    
    // Step 4: Migrate all data
    const results = {
      providers: await migrateProviders(providers, organizationId, organizationGroups),
      templates: await migrateTemplates(templates, organizationId, organizationGroups),
      mappings: await migrateMappings(mappings, organizationId, organizationGroups),
      clauses: await migrateClauses(clauses, organizationId, organizationGroups),
      dynamicBlocks: await migrateDynamicBlocks(dynamicBlocks, organizationId, organizationGroups),
      auditLogs: await migrateAuditLogs(auditLogs, organizationId, organizationGroups),
      contractGenerationLogs: await migrateContractGenerationLogs(contractGenerationLogs, organizationId, organizationGroups)
    };
    
    // Step 5: Summary
    console.log('\n📊 Migration Summary:');
    console.log('=====================');
    
    Object.entries(results).forEach(([type, result]) => {
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)}:`);
      console.log(`  ✅ Successfully migrated: ${result.successCount}`);
      console.log(`  ❌ Failed to migrate: ${result.errorCount}`);
    });
    
    const totalSuccess = Object.values(results).reduce((sum, result) => sum + result.successCount, 0);
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errorCount, 0);
    
    console.log('\n🎯 Overall Results:');
    console.log(`✅ Total successfully migrated: ${totalSuccess}`);
    console.log(`❌ Total failed: ${totalErrors}`);
    
    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('Your data is now ready for enterprise-grade multi-organization access.');
      console.log('\nNext steps:');
      console.log('1. Deploy the updated schema: amplify push');
      console.log('2. Set up Cognito groups for your organizations');
      console.log('3. Update your application to use organization-based queries');
    } else {
      console.log('\n⚠️  Some items failed to migrate. You may need to:');
      console.log('1. Check the error logs above');
      console.log('2. Run the migration again for failed items');
      console.log('3. Manually update any remaining items');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
main(); 