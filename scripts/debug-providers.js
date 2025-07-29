/**
 * Debug Provider Visibility Issue
 * 
 * This script helps diagnose why providers aren't visible by:
 * - Checking if providers exist in the database
 * - Testing different authorization methods
 * - Providing detailed error information
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
        organizationName
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

const listProvidersByYear = `
  query ProvidersByCompensationYear($compensationYear: String!, $limit: Int, $nextToken: String) {
    providersByCompensationYear(compensationYear: $compensationYear, limit: $limit, nextToken: $nextToken) {
      items {
        id
        employeeId
        name
        owner
        organizationName
        compensationYear
        createdAt
        updatedAt
      }
      nextToken
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

async function testProviderQueries(userSub) {
  console.log('\n🔍 Testing provider queries...');
  
  // Test 1: Basic list providers
  console.log('\n📋 Test 1: Basic listProviders query');
  try {
    const result = await client.graphql({
      query: listProviders,
      variables: { limit: 1000 }
    });
    
    const providers = result.data.listProviders.items;
    console.log(`✅ Found ${providers.length} providers`);
    
    if (providers.length > 0) {
      console.log('📊 Provider details:');
      providers.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.name} (ID: ${provider.id})`);
        console.log(`     Owner: ${provider.owner || 'null'}`);
        console.log(`     Organization: ${provider.organizationName || 'null'}`);
        console.log(`     Created: ${provider.createdAt}`);
      });
    }
    
    return providers;
  } catch (error) {
    console.error('❌ Error with listProviders:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    return [];
  }
  
  // Test 2: List providers by year
  console.log('\n📋 Test 2: ProvidersByCompensationYear query');
  try {
    const result = await client.graphql({
      query: listProvidersByYear,
      variables: { compensationYear: '2025', limit: 1000 }
    });
    
    const providers = result.data.providersByCompensationYear.items;
    console.log(`✅ Found ${providers.length} providers for 2025`);
    
    if (providers.length > 0) {
      console.log('📊 Provider details:');
      providers.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.name} (ID: ${provider.id})`);
        console.log(`     Owner: ${provider.owner || 'null'}`);
        console.log(`     Organization: ${provider.organizationName || 'null'}`);
        console.log(`     Year: ${provider.compensationYear}`);
      });
    }
  } catch (error) {
    console.error('❌ Error with providersByCompensationYear:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
  }
}

async function checkUserGroups() {
  console.log('\n👥 Checking user groups...');
  
  try {
    const currentUser = await getCurrentUser();
    console.log('✅ Current user:', currentUser.userId);
    
    // Get user attributes to check groups
    const userAttributes = currentUser.signInDetails?.loginId;
    console.log('📧 User email:', userAttributes);
    
    // Note: Groups are typically available in the ID token
    console.log('ℹ️  User groups are typically available in the ID token');
    console.log('ℹ️  Check your browser console for cognito:groups in the ID token');
    
  } catch (error) {
    console.error('❌ Error getting user info:', error.message);
  }
}

async function checkDatabaseDirectly() {
  console.log('\n🗄️  Checking database directly...');
  
  try {
    // Try to get a single provider by ID (if we know one)
    console.log('ℹ️  Attempting to check if any providers exist...');
    
    // This is a fallback - we'll try to get providers without filters
    const result = await client.graphql({
      query: listProviders,
      variables: { limit: 1 }
    });
    
    if (result.data.listProviders.items.length > 0) {
      console.log('✅ Providers exist in database');
      console.log('📊 First provider:', result.data.listProviders.items[0]);
    } else {
      console.log('❌ No providers found in database');
      console.log('💡 This suggests:');
      console.log('   - No providers have been created yet');
      console.log('   - Providers were deleted');
      console.log('   - There\'s a database connection issue');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.log('💡 This suggests an authorization or connection issue');
  }
}

async function main() {
  try {
    console.log('🔧 Debug Provider Visibility Issue');
    console.log('==================================\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Check user groups
    await checkUserGroups();
    
    // Step 3: Test provider queries
    const providers = await testProviderQueries(userSub);
    
    // Step 4: Check database directly
    await checkDatabaseDirectly();
    
    // Step 5: Summary and recommendations
    console.log('\n📊 Summary:');
    console.log('===========');
    
    if (providers.length === 0) {
      console.log('❌ No providers found');
      console.log('\n💡 Possible causes:');
      console.log('1. No providers have been created yet');
      console.log('2. Providers exist but you don\'t have permission to see them');
      console.log('3. Database connection issue');
      console.log('4. Authorization rules are blocking access');
      
      console.log('\n🔧 Next steps:');
      console.log('1. Check if you have any providers in your CSV data');
      console.log('2. Try uploading a CSV file to create providers');
      console.log('3. Check the browser console for authorization errors');
      console.log('4. Verify your user has the correct permissions');
    } else {
      console.log(`✅ Found ${providers.length} providers`);
      console.log('\n💡 Providers exist but may not be visible due to:');
      console.log('1. Owner field mismatch');
      console.log('2. Authorization rules');
      console.log('3. Organization field requirements');
      
      console.log('\n🔧 Next steps:');
      console.log('1. Check the owner field of providers');
      console.log('2. Update provider owners if needed');
      console.log('3. Check authorization rules in schema');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

// Run the debug script
main(); 