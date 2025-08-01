// Simple test to check CSV headers
const fs = require('fs');
const Papa = require('papaparse');

// Read the CSV file
const csvContent = fs.readFileSync('ENTERPRISE_PROVIDER_TEMPLATE.csv', 'utf8');

// Parse just the headers
const result = Papa.parse(csvContent, {
  header: true,
  preview: 1 // Only parse first row to get headers
});

console.log('🔍 CSV Headers found:');
console.log(result.meta.fields);

console.log('\n📋 First row data:');
console.log(result.data[0]);

// Test field mapping
function normalizeFieldName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

console.log('\n🎯 Testing organization field mapping:');
const orgHeaders = ['Organization ID', 'Organization Name', 'organizationId', 'organizationName'];
orgHeaders.forEach(header => {
  const normalized = normalizeFieldName(header);
  console.log(`"${header}" -> normalized: "${normalized}"`);
}); 