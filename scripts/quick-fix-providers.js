/**
 * Quick Fix for Provider Visibility
 * 
 * This script updates existing providers to make them visible to the current user
 * by setting the owner field to the current user's ID.
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize GraphQL client
const client = generateClient();

// GraphQL queries
const listProviders = `
  query ListProviders($limit: Int, $nextToken: String) {
    listProviders(limit: $limit, nextToken: $nextToken) {
      items {
        id
        employeeId
        name
        owner
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

async function getAllProviders() {
  console.log('📋 Fetching all providers...');
  const allProviders = [];
  let nextToken = null;
  
  do {
    try {
      const result = await client.graphql({
        query: listProviders,
        variables: { limit: 1000, nextToken }
      });
      
      const providers = result.data.listProviders.items;
      allProviders.push(...providers);
      nextToken = result.data.listProviders.nextToken;
      
      console.log(`📊 Fetched ${providers.length} providers (total: ${allProviders.length})`);
    } catch (error) {
      console.error('❌ Error fetching providers:', error.message);
      throw error;
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

async function main() {
  try {
    console.log('🚀 Quick Fix for Provider Visibility...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Get all providers
    const providers = await getAllProviders();
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
    
    // Step 4: Update providers
    console.log('\n🔄 Updating provider owners...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < providersToUpdate.length; i++) {
      const provider = providersToUpdate[i];
      console.log(`\n[${i + 1}/${providersToUpdate.length}] Updating provider: ${provider.name} (${provider.id})`);
      console.log(`   Current owner: ${provider.owner || 'null'} → New owner: ${userSub}`);
      
      const success = await updateProviderOwner(provider.id, userSub);
      if (success) {
        successCount++;
        console.log('   ✅ Updated successfully');
      } else {
        errorCount++;
        console.log('   ❌ Update failed');
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 5: Summary
    console.log('\n📊 Update Summary:');
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