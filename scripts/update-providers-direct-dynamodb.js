/**
 * Update Providers Direct DynamoDB Access
 * 
 * This script uses AWS SDK directly to access DynamoDB and update
 * all providers to have the current user as the owner, bypassing
 * GraphQL authorization restrictions.
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: awsconfig.aws_project_region
});

// Get table name from aws-exports
const getTableName = () => {
  // Extract table name from aws-exports
  const tableName = awsconfig.aws_appsync_graphqlEndpoint
    .split('/')[1]
    .split('-')[0];
  return `Provider-${tableName}-production`;
};

async function signInUser() {
  try {
    console.log('🔐 Attempting to sign in...');
    
    const email = process.env.USER_EMAIL || 'wherdzik@gmail.com';
    const password = process.env.USER_PASSWORD;
    
    if (!password) {
      console.error('❌ USER_PASSWORD environment variable is required');
      console.log('Please set it: $env:USER_PASSWORD="your-password"');
      process.exit(1);
    }
    
    const user = await signIn({ username: email, password });
    console.log('✅ Successfully signed in as:', user.username);
    
    const currentUser = await getCurrentUser();
    const userSub = currentUser.userId;
    console.log('👤 Current user sub:', userSub);
    
    return userSub;
  } catch (error) {
    console.error('❌ Sign in failed:', error.message);
    process.exit(1);
  }
}

async function scanAllProviders(tableName) {
  console.log(`📋 Scanning DynamoDB table: ${tableName}`);
  const allProviders = [];
  let lastEvaluatedKey = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 Scanning page ${pageCount}...`);
    
    try {
      const scanCommand = new ScanCommand({
        TableName: tableName,
        Limit: 1000,
        ExclusiveStartKey: lastEvaluatedKey
      });
      
      const result = await dynamoClient.send(scanCommand);
      const providers = result.Items.map(item => unmarshall(item));
      allProviders.push(...providers);
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      console.log(`📊 Scanned ${providers.length} providers (total: ${allProviders.length})`);
      
      if (lastEvaluatedKey) {
        console.log(`📄 More pages available`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error scanning page ${pageCount}:`, error.message);
      break;
    }
  } while (lastEvaluatedKey);
  
  return allProviders;
}

async function updateProviderOwner(tableName, providerId, newOwner) {
  try {
    const updateCommand = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({ id: providerId }),
      UpdateExpression: 'SET #owner = :owner',
      ExpressionAttributeNames: {
        '#owner': 'owner'
      },
      ExpressionAttributeValues: marshall({
        ':owner': newOwner
      })
    });
    
    await dynamoClient.send(updateCommand);
    return true;
  } catch (error) {
    console.error(`❌ Error updating provider ${providerId}:`, error.message);
    return false;
  }
}

async function updateProvidersInBatches(tableName, providers, userSub, batchSize = 50) {
  console.log(`\n🔄 Updating ${providers.length} providers in batches of ${batchSize}...`);
  
  let successCount = 0;
  let errorCount = 0;
  const batches = [];
  
  // Split providers into batches
  for (let i = 0; i < providers.length; i += batchSize) {
    batches.push(providers.slice(i, i + batchSize));
  }
  
  console.log(`📦 Created ${batches.length} batches`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} providers)`);
    
    // Process batch sequentially to avoid rate limiting
    for (let index = 0; index < batch.length; index++) {
      const provider = batch[index];
      const globalIndex = batchIndex * batchSize + index;
      
      console.log(`   [${globalIndex + 1}/${providers.length}] Updating: ${provider.name || provider.employeeId || provider.id}`);
      console.log(`      Current owner: ${provider.owner || 'null'} → New owner: ${userSub}`);
      
      const success = await updateProviderOwner(tableName, provider.id, userSub);
      if (success) {
        successCount++;
        console.log('      ✅ Updated successfully');
      } else {
        errorCount++;
        console.log('      ❌ Update failed');
      }
      
      // Add small delay between updates
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Progress update
    console.log(`\n📊 Batch ${batchIndex + 1} complete:`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed to update: ${errorCount}`);
    console.log(`   📈 Progress: ${Math.round((batchIndex + 1) / batches.length * 100)}%`);
    
    // Add delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      console.log('   ⏳ Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return { successCount, errorCount };
}

async function main() {
  try {
    console.log('🚀 Update Providers Direct DynamoDB Access...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Get table name
    const tableName = getTableName();
    console.log(`📋 Using table: ${tableName}`);
    
    // Step 3: Scan all providers from DynamoDB
    const providers = await scanAllProviders(tableName);
    console.log(`\n📊 Found ${providers.length} total providers in DynamoDB`);
    
    if (providers.length === 0) {
      console.log('🎉 No providers found to update!');
      return;
    }
    
    // Step 4: Check which providers need updating
    const providersToUpdate = providers.filter(p => p.owner !== userSub);
    const alreadyCorrect = providers.filter(p => p.owner === userSub);
    
    console.log(`✅ ${alreadyCorrect.length} providers already have correct owner`);
    console.log(`🔄 ${providersToUpdate.length} providers need owner update`);
    
    if (providersToUpdate.length === 0) {
      console.log('🎉 All providers already have the correct owner!');
      console.log('You should now be able to see all providers in the app.');
      return;
    }
    
    // Step 5: Update providers in batches
    const { successCount, errorCount } = await updateProvidersInBatches(tableName, providersToUpdate, userSub);
    
    // Step 6: Summary
    console.log('\n📊 Final Summary:');
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed to update: ${errorCount}`);
    console.log(`🎯 Total providers now accessible: ${alreadyCorrect.length + successCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some providers failed to update. You may need to run this script again.');
    } else {
      console.log('\n🎉 All providers have been successfully updated!');
      console.log('You should now be able to see all providers in the app.');
      console.log('\nNext steps:');
      console.log('1. Refresh your browser');
      console.log('2. Navigate to the /providers screen');
      console.log('3. You should now see all your providers');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 