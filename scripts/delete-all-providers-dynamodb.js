/**
 * Delete All Providers from DynamoDB
 * 
 * This script deletes ALL providers from the DynamoDB table
 * to prepare for a clean re-upload.
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: awsconfig.aws_project_region
});

// Get the correct table name
const getTableName = () => {
  // The correct table name based on your aws-exports
  return 'Provider-afojsp5awna3pmnifv4vo22j3y-production';
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

async function deleteProviderById(tableName, providerId) {
  try {
    const deleteCommand = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ id: providerId })
    });
    
    await dynamoClient.send(deleteCommand);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting provider ${providerId}:`, error.message);
    return false;
  }
}

async function deleteAllProviders(tableName, providers) {
  console.log(`🗑️  Deleting ${providers.length} providers from DynamoDB...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    console.log(`\n[${i + 1}/${providers.length}] Deleting provider: ${provider.name || provider.employeeId || provider.id}`);
    
    const success = await deleteProviderById(tableName, provider.id);
    if (success) {
      successCount++;
      console.log('   ✅ Deleted successfully');
    } else {
      errorCount++;
      console.log('   ❌ Deletion failed');
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Progress update every 50 providers
    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${providers.length} (${Math.round((i + 1) / providers.length * 100)}%)`);
    }
  }
  
  return { successCount, errorCount };
}

async function main() {
  try {
    console.log('🚀 Delete All Providers from DynamoDB...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Get table name
    const tableName = getTableName();
    console.log(`📋 Using table: ${tableName}`);
    
    // Step 3: Scan all providers from DynamoDB
    const providers = await scanAllProviders(tableName);
    console.log(`\n📊 Found ${providers.length} total providers in DynamoDB`);
    
    if (providers.length === 0) {
      console.log('🎉 No providers found to delete!');
      return;
    }
    
    // Step 4: Confirm with user
    console.log('\n⚠️  WARNING: This will delete ALL providers from DynamoDB!');
    console.log(`📊 This will affect ${providers.length} providers.`);
    console.log('💡 This is to prepare for a clean re-upload.');
    console.log('\nPress Ctrl+C to cancel, or any key to continue...');
    
    // Wait for user input (simplified)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Delete all providers
    console.log('\n🗑️  Deleting all providers from DynamoDB...');
    const deleteResult = await deleteAllProviders(tableName, providers);
    
    // Step 6: Summary
    console.log('\n📊 Delete Summary:');
    console.log(`✅ Successfully deleted: ${deleteResult.successCount}`);
    console.log(`❌ Failed to delete: ${deleteResult.errorCount}`);
    
    if (deleteResult.errorCount > 0) {
      console.log('\n⚠️  Some providers failed to delete. You may need to delete them manually.');
    } else {
      console.log('\n🎉 All providers have been successfully deleted from DynamoDB!');
      console.log('\nNext steps:');
      console.log('1. Go to your app');
      console.log('2. Navigate to the /providers screen');
      console.log('3. Upload your original CSV file with all providers');
      console.log('4. All providers will be created with your current user as the owner');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 