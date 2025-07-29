/**
 * Create Test Providers
 * 
 * This script creates some test providers in the database to verify
 * that the provider system is working correctly.
 */

import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

// Initialize GraphQL client
const client = generateClient();

// GraphQL mutations
const createProvider = `
  mutation CreateProvider($input: CreateProviderInput!) {
    createProvider(input: $input) {
      id
      employeeId
      name
      providerType
      specialty
      fte
      baseSalary
      compensationYear
      organizationName
      owner
      createdAt
      updatedAt
    }
  }
`;

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

async function createTestProvider(userSub, providerData) {
  try {
    const result = await client.graphql({
      query: createProvider,
      variables: {
        input: {
          ...providerData,
          owner: userSub,
          organizationName: 'Test Organization'
        }
      }
    });
    
    return result.data.createProvider;
  } catch (error) {
    console.error(`❌ Error creating provider ${providerData.name}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('🚀 Creating Test Providers...\n');
    
    // Step 1: Sign in
    const userSub = await signInUser();
    
    // Step 2: Define test providers
    const testProviders = [
      {
        employeeId: 'EMP001',
        name: 'Dr. John Smith',
        providerType: 'Physician',
        specialty: 'Cardiology',
        fte: 1.0,
        baseSalary: 250000,
        compensationYear: '2025',
        compensationType: 'Base',
        startDate: '2025-01-01',
        contractTerm: '1 Year',
        ptoDays: 20,
        holidayDays: 10,
        cmeDays: 5,
        cmeAmount: 5000,
        signingBonus: 25000,
        educationBonus: 10000,
        qualityBonus: 15000,
        conversionFactor: 65.0,
        wRVUTarget: 4500,
        credentials: 'MD, FACC',
        compensationModel: 'Base'
      },
      {
        employeeId: 'EMP002',
        name: 'Dr. Sarah Johnson',
        providerType: 'Physician',
        specialty: 'Internal Medicine',
        fte: 0.8,
        baseSalary: 200000,
        compensationYear: '2025',
        compensationType: 'Productivity',
        startDate: '2025-01-01',
        contractTerm: '2 Years',
        ptoDays: 25,
        holidayDays: 10,
        cmeDays: 7,
        cmeAmount: 3000,
        signingBonus: 15000,
        educationBonus: 8000,
        qualityBonus: 12000,
        conversionFactor: 60.0,
        wRVUTarget: 3800,
        credentials: 'MD, FACP',
        compensationModel: 'Productivity'
      },
      {
        employeeId: 'EMP003',
        name: 'Dr. Michael Brown',
        providerType: 'Physician',
        specialty: 'Emergency Medicine',
        fte: 1.0,
        baseSalary: 220000,
        compensationYear: '2025',
        compensationType: 'Hybrid',
        startDate: '2025-01-01',
        contractTerm: '1 Year',
        ptoDays: 22,
        holidayDays: 10,
        cmeDays: 6,
        cmeAmount: 4000,
        signingBonus: 20000,
        educationBonus: 9000,
        qualityBonus: 14000,
        conversionFactor: 62.0,
        wRVUTarget: 4200,
        credentials: 'MD, FACEP',
        compensationModel: 'Hybrid'
      },
      {
        employeeId: 'EMP004',
        name: 'Dr. Emily Davis',
        providerType: 'Physician',
        specialty: 'Pediatrics',
        fte: 0.9,
        baseSalary: 180000,
        compensationYear: '2025',
        compensationType: 'Base',
        startDate: '2025-01-01',
        contractTerm: '3 Years',
        ptoDays: 28,
        holidayDays: 10,
        cmeDays: 8,
        cmeAmount: 3500,
        signingBonus: 12000,
        educationBonus: 7000,
        qualityBonus: 10000,
        conversionFactor: 58.0,
        wRVUTarget: 3500,
        credentials: 'MD, FAAP',
        compensationModel: 'Base'
      },
      {
        employeeId: 'EMP005',
        name: 'Dr. Robert Wilson',
        providerType: 'Physician',
        specialty: 'Orthopedics',
        fte: 1.0,
        baseSalary: 300000,
        compensationYear: '2025',
        compensationType: 'Productivity',
        startDate: '2025-01-01',
        contractTerm: '2 Years',
        ptoDays: 20,
        holidayDays: 10,
        cmeDays: 5,
        cmeAmount: 6000,
        signingBonus: 30000,
        educationBonus: 15000,
        qualityBonus: 20000,
        conversionFactor: 70.0,
        wRVUTarget: 5000,
        credentials: 'MD, FAAOS',
        compensationModel: 'Productivity'
      }
    ];
    
    console.log(`📋 Creating ${testProviders.length} test providers...\n`);
    
    // Step 3: Create providers
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < testProviders.length; i++) {
      const provider = testProviders[i];
      console.log(`\n[${i + 1}/${testProviders.length}] Creating provider: ${provider.name}`);
      
      const createdProvider = await createTestProvider(userSub, provider);
      if (createdProvider) {
        successCount++;
        console.log('   ✅ Created successfully');
        console.log(`   📊 ID: ${createdProvider.id}`);
        console.log(`   📊 Employee ID: ${createdProvider.employeeId}`);
      } else {
        errorCount++;
        console.log('   ❌ Creation failed');
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Step 4: Summary
    console.log('\n📊 Creation Summary:');
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`❌ Failed to create: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Test providers created successfully!');
      console.log('\nNext steps:');
      console.log('1. Refresh your browser');
      console.log('2. Navigate to the /providers screen');
      console.log('3. You should now see the test providers');
      console.log('4. Try uploading your actual CSV data');
    } else {
      console.log('\n⚠️  No providers were created. Check the error messages above.');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 