// Test script to debug field mapping
function normalizeFieldName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Mock the field lookup logic
function createFieldLookup() {
  const lookup = new Map();
  
  // Add organizationId field with its variants
  lookup.set('organizationid', 'organizationId');
  lookup.set('organization id', 'organizationId');
  lookup.set('orgid', 'organizationId');
  
  // Add organizationName field with its variants
  lookup.set('organizationname', 'organizationName');
  lookup.set('organization name', 'organizationName');
  lookup.set('organization', 'organizationName');
  
  return lookup;
}

function mapCsvHeader(csvHeader) {
  const lookup = createFieldLookup();
  const normalized = normalizeFieldName(csvHeader);
  const result = lookup.get(normalized);
  
  console.log(`🔍 Mapping: "${csvHeader}" -> normalized: "${normalized}" -> result: "${result}"`);
  
  return result || null;
}

function testFieldMapping() {
  console.log('🧪 Testing Field Mapping...');
  
  console.log('\n🎯 Testing specific problematic headers:');
  const problematicHeaders = ['Organization ID', 'Organization Name', 'organizationId', 'organizationName'];
  problematicHeaders.forEach(header => {
    const normalized = normalizeFieldName(header);
    const mapped = mapCsvHeader(header);
    console.log(`"${header}" -> normalized: "${normalized}" -> mapped: "${mapped}"`);
  });
  
  // Test what the schema expects
  const schemaVariants = [
    'organization id',
    'organizationid', 
    'org id',
    'organization name',
    'organizationname',
    'organization'
  ];
  
  console.log('\n🔍 Schema variants:');
  schemaVariants.forEach(variant => {
    const normalized = normalizeFieldName(variant);
    console.log(`"${variant}" -> normalized: "${normalized}"`);
  });
}

testFieldMapping(); 