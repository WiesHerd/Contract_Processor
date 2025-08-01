import { generateClient } from 'aws-amplify/api';
import { listProviders, providersByCompensationYear } from './src/graphql/queries.ts';

const client = generateClient();

async function testDynamoDBData() {
  console.log('Testing DynamoDB data access...');
  
  try {
    // Test 1: List all providers
    console.log('\n1. Testing listProviders query...');
    const allProvidersResult = await client.graphql({
      query: listProviders,
      variables: { limit: 100 }
    });
    
    console.log('All providers result:', allProvidersResult);
    const allProviders = allProvidersResult.data?.listProviders?.items || [];
    console.log(`Found ${allProviders.length} total providers`);
    
    // Show compensation years
    const years = [...new Set(allProviders.map(p => p.compensationYear).filter(Boolean))];
    console.log('Available compensation years:', years);
    
    // Test 2: Query by compensation year 2025
    console.log('\n2. Testing providersByCompensationYear query for year 2025...');
    const year2025Result = await client.graphql({
      query: providersByCompensationYear,
      variables: { 
        compensationYear: "2025",
        limit: 100 
      }
    });
    
    console.log('Year 2025 result:', year2025Result);
    const year2025Providers = year2025Result.data?.providersByCompensationYear?.items || [];
    console.log(`Found ${year2025Providers.length} providers for year 2025`);
    
    if (year2025Providers.length > 0) {
      console.log('Sample provider:', year2025Providers[0]);
    }
    
  } catch (error) {
    console.error('Error testing DynamoDB data:', error);
  }
}

testDynamoDBData(); 