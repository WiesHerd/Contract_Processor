import { Amplify } from 'aws-amplify';
import awsconfig from '../src/aws-exports.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getCurrentUser } from 'aws-amplify/auth';

Amplify.configure(awsconfig);

const dynamoClient = new DynamoDBClient({
  region: awsconfig.aws_project_region
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function fixProviderOwnersDirect() {
  try {
    console.log('🔍 Getting current user...');
    const currentUser = await getCurrentUser();
    console.log('👤 Current user ID:', currentUser.userId);
    
    console.log('📋 Scanning providers table...');
    const scanResult = await docClient.send(new ScanCommand({
      TableName: 'Provider-afojsp5awna3pmnifv4vo22j3y-production',
      Limit: 1000
    }));
    
    const providers = scanResult.Items || [];
    console.log(`📊 Found ${providers.length} providers`);
    
    if (providers.length === 0) {
      console.log('❌ No providers found');
      return;
    }
    
    console.log('🔧 Updating provider owners...');
    let updatedCount = 0;
    
    for (const provider of providers) {
      if (provider.owner !== currentUser.userId) {
        try {
          await docClient.send(new UpdateCommand({
            TableName: 'Provider-afojsp5awna3pmnifv4vo22j3y-production',
            Key: { id: provider.id },
            UpdateExpression: 'SET owner = :owner',
            ExpressionAttributeValues: {
              ':owner': currentUser.userId
            }
          }));
          updatedCount++;
          console.log(`✅ Updated provider ${provider.id}`);
        } catch (error) {
          console.error(`❌ Failed to update provider ${provider.id}:`, error);
        }
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} providers`);
    
  } catch (error) {
    console.error('❌ Error fixing provider owners:', error);
  }
}

fixProviderOwnersDirect(); 