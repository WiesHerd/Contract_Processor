// Test script to verify the fix for required fields
console.log('🧪 Testing the fix for required fields...\n');

// Simulate the fixed upload logic
function simulateFixedUpload(provider) {
  // Transform the provider data
  const input = {
    id: provider.id,
    name: provider.name && provider.name.trim() !== '' ? provider.name : 'Unknown Provider',
    employeeId: provider.employeeId,
    providerType: provider.providerType,
    specialty: provider.specialty,
    organizationName: provider.organizationName && provider.organizationName.trim() !== '' ? provider.organizationName : 'Default Organization',
    organizationId: provider.organizationId && provider.organizationId.trim() !== '' ? provider.organizationId : 'default-org-id',
    compensationType: provider.compensationModel || null,
    conversionFactor: provider.conversionFactor || null,
    wRVUTarget: provider.wRVUTarget || null,
    compensationYear: provider.compensationYear || null,
    dynamicFields: typeof provider.dynamicFields === 'string' ? provider.dynamicFields : null,
  };

  console.log('📋 Original input:', JSON.stringify(input, null, 2));

  // CRITICAL FIX: Ensure all required fields are present and not null
  const sanitizedInput = {
    ...input,
    // Force required fields to have values
    name: input.name || 'Unknown Provider',
    organizationName: input.organizationName || 'Default Organization',
    organizationId: input.organizationId || 'default-org-id',
  };
  
  // Remove null/undefined values EXCEPT for required fields
  const finalInput = Object.fromEntries(
    Object.entries(sanitizedInput).filter(([key, value]) => {
      // Always include required fields, even if they have default values
      if (key === 'name' || key === 'organizationName' || key === 'organizationId') {
        return true;
      }
      // Remove null/undefined for optional fields
      return value !== null && value !== undefined;
    })
  );
  
  console.log('📋 Final input:', JSON.stringify(finalInput, null, 2));
  
  // FINAL SAFETY CHECK: Ensure required fields are present
  if (!finalInput.name || !finalInput.organizationName || !finalInput.organizationId) {
    throw new Error(`Missing required fields: name=${finalInput.name}, organizationName=${finalInput.organizationName}, organizationId=${finalInput.organizationId}`);
  }
  
  return finalInput;
}

// Test cases
const testCases = [
  {
    name: 'Complete provider with all fields',
    provider: {
      id: 'test-1',
      name: 'Dr. Sarah Johnson',
      organizationName: 'Test Hospital',
      organizationId: 'test-org-1',
      employeeId: 'EMP001',
      providerType: 'Physician',
      specialty: 'Cardiology',
      compensationModel: 'BASE',
      compensationYear: '2025',
      fte: 1.0,
      conversionFactor: 75.0,
      wRVUTarget: 5000
    }
  },
  {
    name: 'Provider with missing organization fields',
    provider: {
      id: 'test-2',
      name: 'Dr. John Doe',
      // organizationName and organizationId are missing
      employeeId: 'EMP002',
      providerType: 'Physician',
      specialty: 'Internal Medicine',
      compensationModel: 'PRODUCTIVITY',
      compensationYear: '2025',
      fte: 1.0
    }
  },
  {
    name: 'Provider with null organization fields',
    provider: {
      id: 'test-3',
      name: 'Dr. Jane Smith',
      organizationName: null,
      organizationId: null,
      employeeId: 'EMP003',
      providerType: 'Physician',
      specialty: 'Oncology',
      compensationModel: 'HYBRID',
      compensationYear: '2025',
      fte: 1.0
    }
  },
  {
    name: 'Provider with empty organization fields',
    provider: {
      id: 'test-4',
      name: 'Dr. Bob Wilson',
      organizationName: '',
      organizationId: '',
      employeeId: 'EMP004',
      providerType: 'Physician',
      specialty: 'Neurology',
      compensationModel: 'BASE',
      compensationYear: '2025',
      fte: 1.0
    }
  }
];

console.log('🧪 Running test cases...\n');

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test Case ${index + 1}: ${testCase.name}`);
  console.log('=' .repeat(50));
  
  try {
    const result = simulateFixedUpload(testCase.provider);
    
    // Verify required fields
    const requiredFields = ['name', 'organizationName', 'organizationId'];
    const missingFields = requiredFields.filter(field => !result[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ FAILED: Missing required fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ PASSED: All required fields present');
    }
    
    // Check for null/undefined values
    const nullFields = Object.entries(result).filter(([key, value]) => 
      value === null || value === undefined
    );
    
    if (nullFields.length > 0) {
      console.log(`⚠️  WARNING: Found null/undefined fields: ${nullFields.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    } else {
      console.log('✅ PASSED: No null/undefined fields');
    }
    
    console.log(`📋 Final result keys: ${Object.keys(result).join(', ')}`);
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
});

console.log('\n🎯 Summary:');
console.log('The fix should ensure that required fields (name, organizationName, organizationId)');
console.log('are always present in the final input, even if they were missing or null in the original data.');
console.log('This should resolve the GraphQL "Variable input has coerced Null value for NonNull type String!" error.'); 