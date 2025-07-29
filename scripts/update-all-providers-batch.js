/**
 * Update All Providers Owner (Batch Processing)
 * 
 * This script updates all providers in the database to have the current user
 * as the owner, handling pagination and batch processing.
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize GraphQL client
const client = generateClient();

// GraphQL queries and mutations
const listAllProviders = `
  query ListProviders($limit: Int, $nextToken: String) {
    listProviders(limit: $limit, nextToken: $nextToken) {
      items {
        id
        employeeId
        name
        owner
        organizationName
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

const updateProvider = `
  mutation UpdateProvider($input: UpdateProviderInput!) {
    updateProvider(input: $input) {
      id
      employeeId
      name
      owner
      organizationName
    }
  }
`;

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

async function getAllProvidersWithPagination() {
  console.log('📋 Fetching all providers with pagination...');
  const allProviders = [];
  let nextToken = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);
    
    try {
      const result = await client.graphql({
        query: listAllProviders,
        variables: { limit: 1000, nextToken }
      });
      
      const providers = result.data.listProviders.items;
      allProviders.push(...providers);
      nextToken = result.data.listProviders.nextToken;
      
      console.log(`📊 Fetched ${providers.length} providers (total: ${allProviders.length})`);
      
      if (nextToken) {
        console.log(`📄 More pages available (nextToken: ${nextToken.substring(0, 20)}...)`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Error fetching page ${pageCount}:`, error.message);
      if (error.errors) {
        error.errors.forEach(err => {
          console.error(`   - ${err.message}`);
        });
      }
      break;
    }
  } while (nextToken);
  
  return allProviders;
}

async function updateProviderOwner(providerId, newOwner) {
  try {
    await client.graphql({
      query: updateProvider,
      variables: {
        input: {
          id: providerId,
          owner: newOwner
        }
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error updating provider ${providerId}:`, error.message);
    return false;
  }
}

async function updateProvidersInBatches(providers, userSub, batchSize = 50) {
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
    
    // Process batch in parallel (with concurrency limit)
    const batchPromises = batch.map(async (provider, index) => {
      const globalIndex = batchIndex * batchSize + index;
      console.log(`   [${globalIndex + 1}/${providers.length}] Updating: ${provider.name || provider.employeeId || provider.id}`);
      console.log(`      Current owner: ${provider.owner || 'null'} → New owner: ${userSub}`);
      
      const success = await updateProviderOwner(provider.id, userSub);
      if (success) {
        successCount++;
        console.log('      ✅ Updated successfully');
      } else {
        errorCount++;
        console.log('      ❌ Update failed');
      }
      
      return success;
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Progress update
    console.log(`\n📊 Batch ${batchIndex + 1} complete:`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed to update: ${errorCount}`);
    console.log(`   📈 Progress: ${Math.round((batchIndex + 1) / batches.length * 100)}%`);
    
    // Add delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      console.log('   ⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { successCount, errorCount };
}

async function main() {
  try {
    console.log('🚀 Update All Providers Owner (Batch Processing)...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Get all providers with pagination
    const providers = await getAllProvidersWithPagination();
    console.log(`\n📊 Found ${providers.length} total providers`);
    
    if (providers.length === 0) {
      console.log('🎉 No providers found to update!');
      return;
    }
    
    // Step 3: Check which providers need updating
    const providersToUpdate = providers.filter(p => p.owner !== userSub);
    const alreadyCorrect = providers.filter(p => p.owner === userSub);
    
    console.log(`✅ ${alreadyCorrect.length} providers already have correct owner`);
    console.log(`🔄 ${providersToUpdate.length} providers need owner update`);
    
    if (providersToUpdate.length === 0) {
      console.log('🎉 All providers already have the correct owner!');
      console.log('You should now be able to see all providers in the app.');
      return;
    }
    
    // Step 4: Update providers in batches
    const { successCount, errorCount } = await updateProvidersInBatches(providersToUpdate, userSub);
    
    // Step 5: Summary
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