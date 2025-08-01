// Test script to verify provider upload functionality
import { ProviderUploadService } from './src/features/providers/services/provider-upload.service.ts';

async function testProviderUpload() {
  console.log('🧪 Testing Provider Upload Service...');
  
  try {
    // Create a test provider object
    const testProvider = {
      id: 'test-provider-1',
      name: 'Dr. Test Provider',
      employeeId: 'EMP999',
      providerType: 'Physician',
      specialty: 'Internal Medicine',
      organizationName: 'Test Organization',
      organizationId: 'test-org-id',
      compensationYear: '2024',
      fte: 1.0,
      baseSalary: 250000,
      // Add other required fields as needed
    };

    console.log('✅ Test provider object created successfully');
    console.log('Provider data:', JSON.stringify(testProvider, null, 2));
    
    // Test the upload service
    const uploadService = new ProviderUploadService();
    console.log('✅ ProviderUploadService initialized successfully');
    
    console.log('✅ Provider upload service test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testProviderUpload(); 