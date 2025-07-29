/**
 * Check Provider Count
 * 
 * This script helps understand why we're not seeing all providers
 * by testing different query approaches and authorization methods.
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

async function testDifferentQueries(userSub) {
  console.log('\n🔍 Testing different query approaches...');
  
  // Test 1: Basic list providers with different limits
  console.log('\n📋 Test 1: Basic listProviders with different limits');
  
  const limits = [10, 100, 1000];
  for (const limit of limits) {
    try {
      console.log(`\n   Testing with limit: ${limit}`);
      const result = await client.graphql({
        query: listProviders,
        variables: { limit }
      });
      
      const providers = result.data.listProviders.items;
      console.log(`   ✅ Found ${providers.length} providers`);
      
      if (providers.length > 0) {
        console.log('   📊 Sample providers:');
        providers.slice(0, 3).forEach((provider, index) => {
          console.log(`     ${index + 1}. ${provider.name || provider.employeeId || provider.id}`);
          console.log(`        Owner: ${provider.owner || 'null'}`);
        });
      }
      
      if (result.data.listProviders.nextToken) {
        console.log(`   ⚠️  More results available (nextToken exists)`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error with limit ${limit}:`, error.message);
    }
  }
  
  // Test 2: List providers by year
  console.log('\n📋 Test 2: ProvidersByCompensationYear query');
  const years = ['2025', '2024', '2023'];
  
  for (const year of years) {
    try {
      console.log(`\n   Testing year: ${year}`);
      const result = await client.graphql({
        query: listProvidersByYear,
        variables: { compensationYear: year, limit: 1000 }
      });
      
      const providers = result.data.providersByCompensationYear.items;
      console.log(`   ✅ Found ${providers.length} providers for ${year}`);
      
      if (providers.length > 0) {
        console.log('   📊 Sample providers:');
        providers.slice(0, 3).forEach((provider, index) => {
          console.log(`     ${index + 1}. ${provider.name || provider.employeeId || provider.id}`);
          console.log(`        Owner: ${provider.owner || 'null'}`);
          console.log(`        Year: ${provider.compensationYear}`);
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Error with year ${year}:`, error.message);
    }
  }
  
  // Test 3: Check if there are providers with different owners
  console.log('\n📋 Test 3: Checking for providers with different owners');
  try {
    const result = await client.graphql({
      query: listProviders,
      variables: { limit: 1000 }
    });
    
    const providers = result.data.listProviders.items;
    const owners = [...new Set(providers.map(p => p.owner).filter(Boolean))];
    
    console.log(`   📊 Found ${providers.length} providers`);
    console.log(`   📊 Unique owners: ${owners.length}`);
    console.log(`   📊 Owner IDs: ${owners.join(', ')}`);
    
    if (owners.length > 1) {
      console.log('   ⚠️  Multiple owners found - this explains the visibility issue!');
    }
    
  } catch (error) {
    console.error(`   ❌ Error checking owners:`, error.message);
  }
}

async function checkUserPermissions() {
  console.log('\n👥 Checking user permissions...');
  
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

async function main() {
  try {
    console.log('🔧 Check Provider Count');
    console.log('======================\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Check user permissions
    await checkUserPermissions();
    
    // Step 3: Test different queries
    await testDifferentQueries(userSub);
    
    // Step 4: Summary and recommendations
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log('Based on the DynamoDB console showing 1,000 providers but our queries');
    console.log('only returning a few, this suggests:');
    console.log('');
    console.log('1. 🔐 Authorization Issue: The providers exist but are owned by different users');
    console.log('2. 📊 Data Ownership: Your current user can only see providers they own');
    console.log('3. 🎯 Solution: Update all providers to have your user as the owner');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Run the update-all-providers-owner.js script');
    console.log('2. Or implement the enterprise solution for multi-user access');
    console.log('3. Check if there are other users who created these providers');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 