// Simple test to check GraphQL API access
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// Define the queries inline to avoid import issues
const listProvidersQuery = `
  query ListProviders($limit: Int, $nextToken: String) {
    listProviders(limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        compensationYear
        organizationName
      }
      nextToken
    }
  }
`;

const providersByCompensationYearQuery = `
  query ProvidersByCompensationYear($compensationYear: String!, $limit: Int) {
    providersByCompensationYear(compensationYear: $compensationYear, limit: $limit) {
      items {
        id
        name
        compensationYear
        organizationName
      }
      nextToken
    }
  }
`;

async function testGraphQLAccess() {
  console.log('Testing GraphQL API access...');
  
  try {
    // Test 1: List all providers
    console.log('\n1. Testing listProviders...');
    const allProvidersResult = await client.graphql({
      query: listProvidersQuery,
      variables: { limit: 10 }
    });
    
    console.log('All providers result:', JSON.stringify(allProvidersResult, null, 2));
    const allProviders = allProvidersResult.data?.listProviders?.items || [];
    console.log(`Found ${allProviders.length} total providers`);
    
    if (allProviders.length > 0) {
      console.log('Sample provider:', allProviders[0]);
      
      // Show available years
      const years = [...new Set(allProviders.map(p => p.compensationYear).filter(Boolean))];
      console.log('Available compensation years:', years);
    }
    
    // Test 2: Query by compensation year 2025
    console.log('\n2. Testing providersByCompensationYear for year 2025...');
    const year2025Result = await client.graphql({
      query: providersByCompensationYearQuery,
      variables: { 
        compensationYear: "2025",
        limit: 10 
      }
    });
    
    console.log('Year 2025 result:', JSON.stringify(year2025Result, null, 2));
    const year2025Providers = year2025Result.data?.providersByCompensationYear?.items || [];
    console.log(`Found ${year2025Providers.length} providers for year 2025`);
    
    if (year2025Providers.length > 0) {
      console.log('Sample 2025 provider:', year2025Providers[0]);
    }
    
  } catch (error) {
    console.error('Error testing GraphQL access:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }
}

testGraphQLAccess(); 