import { Amplify } from 'aws-amplify';
import awsconfig from '../src/aws-exports.js';
import { generateClient } from 'aws-amplify/api';
import { listProviders } from '../src/graphql/queries.ts';

Amplify.configure(awsconfig);

const client = generateClient();

async function checkProviders() {
  try {
    console.log('🔍 Checking for providers in database...');
    
    const result = await client.graphql({
      query: listProviders,
      variables: { limit: 10 }
    });
    
    console.log('📊 Provider count:', result.data?.listProviders?.items?.length || 0);
    
    if (result.data?.listProviders?.items?.length > 0) {
      console.log('✅ Found providers:', result.data.listProviders.items.length);
      console.log('📋 First provider:', result.data.listProviders.items[0]);
    } else {
      console.log('❌ No providers found in database');
      console.log('💡 You need to upload provider data first');
    }
    
  } catch (error) {
    console.error('❌ Error checking providers:', error);
  }
}

checkProviders(); 