import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debugging Null Field Issues');
console.log('==============================');

// Read the CSV file
const csvPath = path.join(__dirname, 'ENTERPRISE_PROVIDER_TEMPLATE.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV data
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim());
const dataLines = lines.slice(1).filter(line => line.trim());

console.log('\n📋 Checking for empty/null fields in CSV:');
console.log('==========================================');

dataLines.forEach((line, index) => {
  const values = line.split(',');
  const emptyFields = [];
  
  headers.forEach((header, headerIndex) => {
    const value = values[headerIndex] || '';
    if (!value.trim()) {
      emptyFields.push(header);
    }
  });
  
  if (emptyFields.length > 0) {
    console.log(`\nRow ${index + 1} (${values[0]?.trim()}):`);
    emptyFields.forEach(field => {
      console.log(`  ❌ Empty: ${field}`);
    });
  }
});

console.log('\n🔍 Potential Issues:');
console.log('====================');
console.log('1. GraphQL schema may not be deployed with new fields');
console.log('2. Some required fields may be empty in CSV');
console.log('3. Field mapping may not include all new fields');

console.log('\n📝 Next Steps:');
console.log('1. Check if GraphQL schema is deployed');
console.log('2. Verify all required fields are present');
console.log('3. Update field mapping if needed'); 