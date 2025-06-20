#!/usr/bin/env node

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { listProviders } from '../src/graphql/queries';
import { deleteProvider } from '../src/graphql/mutations';
import readline from 'readline';

// Configure Amplify
const awsconfig = {
  "aws_project_region": "us-east-2",
  "aws_appsync_graphqlEndpoint": "https://rwiqxwd4lbbtbmbdoin2wy5hjq.appsync-api.us-east-2.amazonaws.com/graphql",
  "aws_appsync_region": "us-east-2",
  "aws_appsync_authenticationType": "API_KEY",
  "aws_appsync_apiKey": "da2-ub7djmoqkrfwzpm5uxyzbnsali"
};

Amplify.configure(awsconfig);

const client = generateClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔧 ContractEngine Admin CLI');
  console.log('============================\n');

  try {
    // Check current provider count
    console.log('📊 Checking current provider count...');
    const result = await client.graphql({
      query: listProviders,
      variables: { limit: 1 }
    });
    
    const providerCount = result.data.listProviders.items.length;
    console.log(`Current providers: ${providerCount}\n`);

    if (providerCount === 0) {
      console.log('✅ No providers to delete.');
      rl.close();
      return;
    }

    // Confirm deletion
    const confirm = await question(`⚠️  Are you sure you want to delete ALL ${providerCount} providers? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }

    const typeConfirm = await question('Type "DELETE ALL" to confirm: ');
    
    if (typeConfirm !== 'DELETE ALL') {
      console.log('❌ Confirmation failed. Operation cancelled.');
      rl.close();
      return;
    }

    // Get all providers
    console.log('\n🔄 Fetching all providers...');
    const allProviders = await client.graphql({
      query: listProviders,
      variables: { limit: 1000 }
    });

    const providers = allProviders.data.listProviders.items;
    console.log(`Found ${providers.length} providers to delete.\n`);

    // Delete providers
    let deleted = 0;
    const batchSize = 25;
    
    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      
      for (const provider of batch) {
        try {
          await client.graphql({
            query: deleteProvider,
            variables: { input: { id: provider.id } }
          });
          deleted++;
          
          if (deleted % 10 === 0) {
            console.log(`✅ Deleted ${deleted}/${providers.length} providers...`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete provider ${provider.id}:`, error);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Successfully deleted ${deleted} providers!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

main(); 