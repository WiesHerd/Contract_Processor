// Test minimal provider object that should work
const minimalProvider = {
  id: 'test-provider-1',
  name: 'Dr. Test Provider',
  organizationName: 'Test Organization',
  organizationId: 'test-org-id'
};

console.log('🧪 Minimal test provider:', JSON.stringify(minimalProvider, null, 2));

// Check for any null/undefined values
const nullFields = Object.entries(minimalProvider).filter(([key, value]) => value === null || value === undefined);
if (nullFields.length > 0) {
  console.log('❌ Found null/undefined fields:', nullFields);
} else {
  console.log('✅ No null/undefined fields found');
}

// Check required fields
const requiredFields = ['id', 'name', 'organizationName', 'organizationId'];
const missingFields = requiredFields.filter(field => !minimalProvider[field]);
if (missingFields.length > 0) {
  console.log('❌ Missing required fields:', missingFields);
} else {
  console.log('✅ All required fields present');
}

console.log('\n📋 Provider object analysis:');
Object.entries(minimalProvider).forEach(([key, value]) => {
  console.log(`${key}: "${value}" (type: ${typeof value})`);
}); 