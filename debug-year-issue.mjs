import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import fs from 'fs';

// Read config file
const config = JSON.parse(fs.readFileSync('./src/amplifyconfiguration.json', 'utf8'));

// Configure Amplify
Amplify.configure(config);

const client = generateClient();

async function debugYearIssue() {
  console.log('🔍 Debugging year fetching issue...');
  
  try {
    // Test 1: Check if listProviderYears query works
    console.log('\n📋 Test 1: listProviderYears query');
    const result1 = await client.graphql({
      query: /* GraphQL */ `
        query ListProviderYears {
          listProviderYears
        }
      `
    });
    
    console.log('✅ listProviderYears result:', result1.data?.listProviderYears);
    
    // Test 2: Check if we can list all providers
    console.log('\n📋 Test 2: listProviders query');
    const result2 = await client.graphql({
      query: /* GraphQL */ `
        query ListProviders($limit: Int) {
          listProviders(limit: $limit) {
            items {
              id
              name
              compensationYear
              organizationName
            }
            nextToken
          }
        }
      `,
      variables: { limit: 100 }
    });
    
    const providers = result2.data?.listProviders?.items || [];
    console.log(`✅ Found ${providers.length} providers`);
    
    // Extract years from providers
    const years = new Set();
    providers.forEach(provider => {
      if (provider.compensationYear) {
        years.add(provider.compensationYear);
      }
    });
    
    console.log('📊 Years found in providers:', Array.from(years).sort());
    
    // Test 3: Test providersByCompensationYear for a specific year
    if (years.size > 0) {
      const testYear = Array.from(years)[0];
      console.log(`\n📋 Test 3: providersByCompensationYear for year ${testYear}`);
      
      const result3 = await client.graphql({
        query: /* GraphQL */ `
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
        `,
        variables: { compensationYear: testYear, limit: 100 }
      });
      
      const yearProviders = result3.data?.providersByCompensationYear?.items || [];
      console.log(`✅ Found ${yearProviders.length} providers for year ${testYear}`);
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
  }
}

debugYearIssue().catch(console.error); 