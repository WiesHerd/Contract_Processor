// Test script to verify the upload fix works correctly
// This simulates the exact data flow from CSV parsing to GraphQL upload

// Mock the provider data that would come from CSV parsing
const mockProvider = {
  id: 'test-provider-id',
  name: 'Dr. Test Provider',
  employeeId: 'EMP001',
  providerType: 'Physician',
  specialty: 'Cardiology',
  // These fields are required in GraphQL but might be empty in CSV
  organizationName: '', // Empty in CSV
  organizationId: '', // Empty in CSV
  fte: 1.0,
  baseSalary: 200000,
  compensationYear: '2025'
};

// Simulate the uploadWithRetry logic
function simulateUploadWithRetry(provider) {
  console.log('🔍 Original provider data:', JSON.stringify(provider, null, 2));

  // STEP 1: Create the initial input with proper defaults for required fields
  const input = {
    id: provider.id,
    name: provider.name && provider.name.trim() !== '' && provider.name.toLowerCase() !== 'null' ? provider.name : 'Unknown Provider',
    employeeId: provider.employeeId,
    providerType: provider.providerType,
    specialty: provider.specialty,
    // CRITICAL: These are required in GraphQL schema but optional in TypeScript
    organizationName: provider.organizationName && provider.organizationName.trim() !== '' && provider.organizationName.toLowerCase() !== 'null' ? provider.organizationName : 'Default Organization',
    organizationId: provider.organizationId && provider.organizationId.trim() !== '' && provider.organizationId.toLowerCase() !== 'null' ? provider.organizationId : 'default-org-id',
    fte: provider.fte,
    baseSalary: provider.baseSalary,
    compensationYear: provider.compensationYear || null,
  };

  console.log('🔍 Initial input data:', JSON.stringify(input, null, 2));

  // STEP 2: Validate required fields before any filtering
  const requiredFields = ['name', 'organizationName', 'organizationId'];
  const missingFields = requiredFields.filter(field => {
    const value = input[field];
    return !value || value === '' || value === 'null' || value === null;
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // STEP 3: Create sanitized input with guaranteed required field values
  const sanitizedInput = {
    ...input,
    // Force required fields to have non-null values
    name: input.name || 'Unknown Provider',
    organizationName: input.organizationName || 'Default Organization',
    organizationId: input.organizationId || 'default-org-id',
  };

  // STEP 4: Filter out null/undefined values EXCEPT for required fields
  const finalInput = Object.fromEntries(
    Object.entries(sanitizedInput).filter(([key, value]) => {
      // Always include required fields, even if they have default values
      if (requiredFields.includes(key)) {
        return true;
      }
      // Remove null/undefined for optional fields
      return value !== null && value !== undefined;
    })
  );

  console.log('🔍 Final sanitized input:', JSON.stringify(finalInput, null, 2));

  // STEP 5: Final validation - ensure required fields are present and non-null
  const finalValidation = requiredFields.every(field => {
    const value = finalInput[field];
    return value && value !== '' && value !== 'null' && value !== null;
  });

  if (!finalValidation) {
    const invalidFields = requiredFields.filter(field => {
      const value = finalInput[field];
      return !value || value === '' || value === 'null' || value === null;
    });
    throw new Error(`Final validation failed - missing required fields: ${invalidFields.join(', ')}`);
  }

  console.log('🚀 GraphQL variables being sent:', JSON.stringify({ input: finalInput }, null, 2));
  
  return finalInput;
}

// Test cases
console.log('🧪 Testing upload fix...\n');

// Test Case 1: Provider with empty required fields (like the user's CSV)
console.log('📋 Test Case 1: Provider with empty required fields');
try {
  const result1 = simulateUploadWithRetry(mockProvider);
  console.log('✅ Test Case 1 PASSED - Required fields were properly set');
  console.log('✅ Final result:', JSON.stringify(result1, null, 2));
} catch (error) {
  console.error('❌ Test Case 1 FAILED:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test Case 2: Provider with null required fields
console.log('📋 Test Case 2: Provider with null required fields');
const mockProviderWithNulls = {
  ...mockProvider,
  organizationName: null,
  organizationId: null
};

try {
  const result2 = simulateUploadWithRetry(mockProviderWithNulls);
  console.log('✅ Test Case 2 PASSED - Null fields were properly handled');
  console.log('✅ Final result:', JSON.stringify(result2, null, 2));
} catch (error) {
  console.error('❌ Test Case 2 FAILED:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test Case 3: Provider with 'null' string values
console.log('📋 Test Case 3: Provider with "null" string values');
const mockProviderWithNullStrings = {
  ...mockProvider,
  organizationName: 'null',
  organizationId: 'null'
};

try {
  const result3 = simulateUploadWithRetry(mockProviderWithNullStrings);
  console.log('✅ Test Case 3 PASSED - "null" strings were properly handled');
  console.log('✅ Final result:', JSON.stringify(result3, null, 2));
} catch (error) {
  console.error('❌ Test Case 3 FAILED:', error.message);
}

console.log('\n🎉 All tests completed!'); 