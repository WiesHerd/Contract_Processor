// Simple test for field mapping
function normalizeFieldName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Mock the field lookup
const PROVIDER_SCHEMA = [
  { key: 'organizationId', label: 'Organization ID', variants: ['organization id', 'organizationid', 'org id'] },
  { key: 'organizationName', label: 'OrganizationName', variants: ['organization name', 'organizationname', 'organization'] },
];

function createFieldLookup() {
  const lookup = new Map();
  
  PROVIDER_SCHEMA.forEach(field => {
    // Add the primary key
    lookup.set(normalizeFieldName(field.key), field.key);
    lookup.set(normalizeFieldName(field.label), field.key);
    
    // Add all variants
    field.variants.forEach(variant => {
      lookup.set(normalizeFieldName(variant), field.key);
    });
  });
  
  return lookup;
}

function mapCsvHeader(csvHeader) {
  const lookup = createFieldLookup();
  const normalized = normalizeFieldName(csvHeader);
  const result = lookup.get(normalized);
  
  console.log(`🔍 Mapping: "${csvHeader}" -> normalized: "${normalized}" -> result: "${result}"`);
  
  return result || null;
}

// Test the mapping
console.log('🧪 Testing field mapping...');

const testHeaders = ['Organization ID', 'Organization Name'];
testHeaders.forEach(header => {
  const mapped = mapCsvHeader(header);
  console.log(`"${header}" -> "${mapped}"`);
});

console.log('\n🔍 Available lookup keys:');
const lookup = createFieldLookup();
Array.from(lookup.keys()).forEach(key => {
  console.log(`"${key}" -> "${lookup.get(key)}"`);
}); 