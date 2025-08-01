// Direct test script to upload a single provider
import { generateClient } from 'aws-amplify/api';

// Custom GraphQL mutation that only requests fields that exist in the schema
const createProviderCustom = /* GraphQL */ `
  mutation CreateProvider($input: CreateProviderInput!) {
    createProvider(input: $input) {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      organizationId
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      qualityBonus
      educationBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      administrativeFte
      administrativeRole
      fteBreakdown {
        activity
        percentage
      }
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
    }
  }
`;

const client = generateClient();

async function testSingleProviderUpload() {
  console.log('🧪 Testing single provider upload...');
  
  // Create a minimal test provider
  const testProvider = {
    name: 'Dr. Test Provider',
    employeeId: 'EMP999',
    providerType: 'Physician',
    specialty: 'Internal Medicine',
    organizationName: 'Test Organization',
    organizationId: 'test-org-id',
    compensationYear: '2025',
    fte: 1.0,
    compensationModel: 'BASE'
  };
  
  console.log('📋 Test provider data:', JSON.stringify(testProvider, null, 2));
  
  try {
    console.log('🚀 Attempting to create provider...');
    
    const result = await client.graphql({
      query: createProviderCustom, // Use custom mutation instead of auto-generated one
      variables: { input: testProvider },
      authMode: 'apiKey'
    });
    
    console.log('✅ Success! Provider created:', result.data?.createProvider);
    
  } catch (error) {
    console.error('❌ Error creating provider:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    if (error.errors) {
      console.error('❌ GraphQL errors:', error.errors);
    }
  }
}

// Run the test
testSingleProviderUpload(); 