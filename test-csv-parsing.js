// Test CSV parsing logic
import fs from 'fs';

// Read the CSV file
const csvContent = fs.readFileSync('ENTERPRISE_PROVIDER_TEMPLATE.csv', 'utf8');

// Simple CSV parsing
const lines = csvContent.split('\n');
const headers = lines[0].split(',');
const dataRow = lines[1].split(',');

console.log('🔍 CSV Headers:', headers);
console.log('🔍 First row data:', dataRow);

// Find the organization ID column
const orgIdIndex = headers.findIndex(header => header.trim() === 'Organization ID');
const orgNameIndex = headers.findIndex(header => header.trim() === 'Organization Name');

console.log('🔍 Organization ID column index:', orgIdIndex);
console.log('🔍 Organization Name column index:', orgNameIndex);

if (orgIdIndex !== -1) {
  console.log('🔍 Organization ID value:', dataRow[orgIdIndex]);
} else {
  console.log('❌ Organization ID column not found!');
}

if (orgNameIndex !== -1) {
  console.log('🔍 Organization Name value:', dataRow[orgNameIndex]);
} else {
  console.log('❌ Organization Name column not found!');
}

// Test the field mapping logic
function normalizeFieldName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

console.log('\n🎯 Testing field mapping:');
headers.forEach((header, index) => {
  const normalized = normalizeFieldName(header.trim());
  console.log(`"${header.trim()}" -> "${normalized}" (index: ${index})`);
}); 