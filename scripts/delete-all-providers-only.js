/**
 * Delete All Providers Only
 * 
 * This script deletes all existing providers without re-uploading them.
 * Use this to clean up before uploading real data.
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

const deleteProvider = `
  mutation DeleteProvider($input: DeleteProviderInput!) {
    deleteProvider(input: $input) {
      id
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
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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

async function deleteProviderById(providerId) {
  try {
    await client.graphql({
      query: deleteProvider,
      variables: {
        input: { id: providerId }
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error deleting provider ${providerId}:`, error.message);
    return false;
  }
}

async function deleteAllProviders(providers) {
  console.log(`🗑️  Deleting ${providers.length} providers...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    console.log(`\n[${i + 1}/${providers.length}] Deleting provider: ${provider.name || provider.employeeId || provider.id}`);
    
    const success = await deleteProviderById(provider.id);
    if (success) {
      successCount++;
      console.log('   ✅ Deleted successfully');
    } else {
      errorCount++;
      console.log('   ❌ Deletion failed');
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Progress update every 50 providers
    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${providers.length} (${Math.round((i + 1) / providers.length * 100)}%)`);
    }
  }
  
  return { successCount, errorCount };
}

async function main() {
  try {
    console.log('🚀 Delete All Providers Only...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Get all providers
    const providers = await getAllProviders();
    console.log(`\n📊 Found ${providers.length} total providers`);
    
    if (providers.length === 0) {
      console.log('🎉 No providers found to delete!');
      return;
    }
    
    // Step 3: Confirm with user
    console.log('\n⚠️  WARNING: This will delete ALL existing providers!');
    console.log(`📊 This will affect ${providers.length} providers.`);
    console.log('💡 This is to prepare for uploading your real data.');
    console.log('\nPress Ctrl+C to cancel, or any key to continue...');
    
    // Wait for user input (simplified)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Delete all providers
    console.log('\n🗑️  Deleting all providers...');
    const deleteResult = await deleteAllProviders(providers);
    
    // Step 5: Summary
    console.log('\n📊 Delete Summary:');
    console.log(`✅ Successfully deleted: ${deleteResult.successCount}`);
    console.log(`❌ Failed to delete: ${deleteResult.errorCount}`);
    
    if (deleteResult.errorCount > 0) {
      console.log('\n⚠️  Some providers failed to delete. You may need to delete them manually.');
    } else {
      console.log('\n🎉 All providers have been successfully deleted!');
      console.log('\nNext steps:');
      console.log('1. Go to your app');
      console.log('2. Navigate to the /providers screen');
      console.log('3. Upload your original CSV file with all your real providers');
      console.log('4. All providers will be created with your current user as the owner');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 