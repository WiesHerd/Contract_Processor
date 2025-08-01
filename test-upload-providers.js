import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import fs from 'fs';
import Papa from 'papaparse';

// Read config file
const config = JSON.parse(fs.readFileSync('./src/amplifyconfiguration.json', 'utf8'));

// Configure Amplify
Amplify.configure(config);

const client = generateClient();

async function testUploadProviders() {
  console.log('🔍 Testing provider upload...');
  
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('./ENTERPRISE_PROVIDER_TEMPLATE_SIMPLIFIED.csv', 'utf8');
    
    // Parse CSV
    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    console.log('📊 Parsed CSV data:', results.data);
    
    // Convert to provider format
    const providers = results.data.map((row, index) => ({
      id: `test-provider-${index + 1}`,
      name: row['Provider Name'],
      employeeId: row['Employee ID'],
      providerType: row['Provider Type'],
      specialty: row['Specialty'],
      organizationName: row['Organization Name'],
      organizationId: row['Organization ID'],
      compensationYear: row['Compensation Year'],
      totalFTE: parseFloat(row['Total FTE']),
      administrativeRole: row['Administrative Role'],
      // Add required fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: 'test-user'
    }));
    
    console.log('📋 Converted providers:', providers);
    
    // Try to create providers one by one
    for (const provider of providers) {
      try {
        console.log(`📝 Creating provider: ${provider.name}`);
        
        const result = await client.graphql({
          query: /* GraphQL */ `
            mutation CreateProvider($input: CreateProviderInput!) {
              createProvider(input: $input) {
                id
                name
                compensationYear
                organizationName
              }
            }
          `,
          variables: { input: provider }
        });
        
        console.log('✅ Provider created:', result.data?.createProvider);
      } catch (error) {
        console.error('❌ Error creating provider:', error);
        if (error.errors) {
          error.errors.forEach(err => {
            console.error(`   - ${err.message}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during upload test:', error);
  }
}

testUploadProviders().catch(console.error); 