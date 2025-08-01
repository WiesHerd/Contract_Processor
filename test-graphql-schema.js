// Test to check GraphQL schema expectations
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

async function checkGraphQLSchema() {
  console.log('🔍 Checking GraphQL schema...');
  
  try {
    // Try to get the introspection query to see the schema
    const result = await client.graphql({
      query: `
        query IntrospectionQuery {
          __schema {
            types {
              name
              fields {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      `,
      authMode: 'apiKey'
    });
    
    console.log('✅ Schema introspection result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error getting schema:', error);
    
    // Try a simpler approach - just test what fields are required
    console.log('🔍 Testing required fields...');
    
    const testCases = [
      // Test 1: Minimal required fields
      {
        name: 'Dr. Test',
        organizationName: 'Test Org',
        organizationId: 'test-id'
      },
      // Test 2: With all fields
      {
        name: 'Dr. Test',
        employeeId: 'EMP999',
        providerType: 'Physician',
        specialty: 'Internal Medicine',
        organizationName: 'Test Org',
        organizationId: 'test-id',
        compensationYear: '2025',
        fte: 1.0,
        compensationModel: 'BASE'
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n🧪 Test case ${i + 1}:`, JSON.stringify(testCase, null, 2));
      
      try {
        const result = await client.graphql({
          query: `
            mutation CreateProvider($input: CreateProviderInput!) {
              createProvider(input: $input) {
                id
                name
                organizationId
              }
            }
          `,
          variables: { input: testCase },
          authMode: 'apiKey'
        });
        
        console.log(`✅ Test case ${i + 1} succeeded:`, result.data?.createProvider);
        
      } catch (error) {
        console.error(`❌ Test case ${i + 1} failed:`, error.message);
        if (error.errors) {
          console.error('GraphQL errors:', error.errors);
        }
      }
    }
  }
}

checkGraphQLSchema(); 