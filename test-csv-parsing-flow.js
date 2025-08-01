// Test script to simulate the exact CSV parsing flow
console.log('🧪 Testing CSV parsing flow...\n');

// Simulate the CSV data from the user's file
const csvRow = {
  'Provider Name': 'Dr. Sarah Johnson',
  'Employee ID': 'EMP001',
  'Provider Type': 'Physician',
  'Specialty': 'Cardiology',
  'Subspecialty': '', // Empty!
  'Position Title': '', // Empty!
  'Years of Experience': '15',
  'Hourly Wage': '0',
  'Base Salary': '280000',
  'Original Agreement Date': '2024-01-15',
  'Organization Name': 'Default Organization',
  'Organization ID': 'default-org-id',
  'Start Date': '2024-01-15',
  'Contract Term': '12 months',
  'PTO Days': '20',
  'Holiday Days': '10',
  'CME Days': '5',
  'CME Amount': '5000',
  'Signing Bonus': '0',
  'Relocation Bonus': '0',
  'Quality Bonus': '0',
  'Education Bonus': '0',
  'Compensation Type': 'Salary',
  'Conversion Factor': '0',
  'wRVU Target': '0',
  'Compensation Year': '2024',
  'Credentials': 'MD',
  'Clinical FTE': '0.8',
  'Medical Director FTE': '0',
  'Division Chief FTE': '0',
  'Research FTE': '0',
  'Teaching FTE': '0',
  'Total FTE': '1.0',
  'Administrative FTE': '0.2',
  'Administrative Role': 'Medical Director'
};

console.log('📋 Original CSV row:', JSON.stringify(csvRow, null, 2));

// Simulate the field mapping logic
const fieldMappings = {
  'Provider Name': 'name',
  'Employee ID': 'employeeId',
  'Provider Type': 'providerType',
  'Specialty': 'specialty',
  'Organization Name': 'organizationName',
  'Organization ID': 'organizationId',
  'Compensation Year': 'compensationYear',
  'Years of Experience': 'yearsExperience',
  'Hourly Wage': 'hourlyWage',
  'Base Salary': 'baseSalary',
  'Original Agreement Date': 'originalAgreementDate',
  'Start Date': 'startDate',
  'Contract Term': 'contractTerm',
  'PTO Days': 'ptoDays',
  'Holiday Days': 'holidayDays',
  'CME Days': 'cmeDays',
  'CME Amount': 'cmeAmount',
  'Signing Bonus': 'signingBonus',
  'Relocation Bonus': 'relocationBonus',
  'Quality Bonus': 'qualityBonus',
  'Education Bonus': 'educationBonus',
  'Compensation Type': 'compensationType',
  'Conversion Factor': 'conversionFactor',
  'wRVU Target': 'wRVUTarget',
  'Credentials': 'credentials',
  'Clinical FTE': 'clinicalFte',
  'Medical Director FTE': 'medicalDirectorFte',
  'Division Chief FTE': 'divisionChiefFte',
  'Research FTE': 'researchFte',
  'Teaching FTE': 'teachingFte',
  'Total FTE': 'fte',
  'Administrative FTE': 'administrativeFte',
  'Administrative Role': 'administrativeRole'
};

// Simulate the parsing logic from the upload service
function simulateParsing(csvRow) {
  // Initialize provider with required fields
  const provider = {
    id: 'test-id-' + Math.random().toString(36).substr(2, 9),
    name: '',
    compensationModel: 'BASE'
  };

  // Separate flat fields from dynamic fields
  const dynamicFields = {};
  
  // Process each CSV column
  Object.entries(csvRow).forEach(([csvHeader, value]) => {
    // Try to map CSV header to schema field
    const schemaField = fieldMappings[csvHeader];
    
    if (schemaField) {
      // For required fields, always set them even if empty
      const isRequiredField = ['name', 'organizationName', 'organizationId'].includes(schemaField);
      
      if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
        if (isRequiredField) {
          // Set default values for required fields
          if (schemaField === 'organizationId') {
            provider[schemaField] = 'default-org-id';
            console.log(`Set required field ${schemaField} = default-org-id`);
          } else if (schemaField === 'organizationName') {
            provider[schemaField] = 'Default Organization';
            console.log(`Set required field ${schemaField} = Default Organization`);
          } else if (schemaField === 'name') {
            provider[schemaField] = 'Unknown Provider';
            console.log(`Set required field ${schemaField} = Unknown Provider`);
          }
        } else {
          // Skip empty values for non-required fields
          console.log(`Skipping empty value for field: ${schemaField}`);
        }
        return;
      }
      
      // Store as flat field in DynamoDB
      const parsedValue = parseFieldValue(schemaField, value);
      if (parsedValue !== null) {
        provider[schemaField] = parsedValue;
      }
    } else {
      // Store as dynamic field only if truly unknown
      console.log(`Unknown column detected: "${csvHeader}" - storing in dynamicFields`);
      dynamicFields[csvHeader] = value.trim();
    }
  });

  // Only add dynamicFields if there are truly unknown columns
  if (Object.keys(dynamicFields).length > 0) {
    provider.dynamicFields = JSON.stringify(dynamicFields);
    console.log(`Provider ${provider.name} has ${Object.keys(dynamicFields).length} dynamic fields:`, Object.keys(dynamicFields));
  }

  // Ensure required fields have defaults
  if (!provider.name) provider.name = 'Unknown Provider';
  if (!provider.organizationName) provider.organizationName = 'Default Organization';
  if (!provider.organizationId) provider.organizationId = 'default-org-id';
  if (!provider.fte) provider.fte = 1.0;
  if (!provider.compensationModel) provider.compensationModel = 'BASE';

  return provider;
}

// Simple field value parser
function parseFieldValue(field, value) {
  if (!value || value.trim() === '') return null;
  
  const trimmedValue = value.trim();
  
  // Handle different field types
  if (field === 'fte' || field === 'administrativeFte' || field === 'clinicalFte' || 
      field === 'medicalDirectorFte' || field === 'divisionChiefFte' || 
      field === 'researchFte' || field === 'teachingFte') {
    const num = parseFloat(trimmedValue);
    return isNaN(num) ? null : num;
  }
  
  if (field === 'yearsExperience' || field === 'ptoDays' || field === 'holidayDays' || 
      field === 'cmeDays' || field === 'cmeAmount' || field === 'signingBonus' || 
      field === 'relocationBonus' || field === 'qualityBonus' || field === 'educationBonus') {
    const num = parseInt(trimmedValue);
    return isNaN(num) ? null : num;
  }
  
  if (field === 'hourlyWage' || field === 'baseSalary' || field === 'conversionFactor' || 
      field === 'wRVUTarget') {
    const num = parseFloat(trimmedValue);
    return isNaN(num) ? null : num;
  }
  
  // Default to string
  return trimmedValue;
}

// Simulate the transformation to CreateProviderInput
function simulateTransformation(provider) {
  const input = {
    id: provider.id,
    name: provider.name && provider.name.trim() !== '' ? provider.name : 'Unknown Provider',
    employeeId: provider.employeeId,
    providerType: provider.providerType,
    specialty: provider.specialty,
    subspecialty: provider.subspecialty,
    fte: provider.fte,
    administrativeFte: provider.administrativeFte,
    administrativeRole: provider.administrativeRole,
    yearsExperience: provider.yearsExperience,
    hourlyWage: provider.hourlyWage,
    baseSalary: provider.baseSalary,
    originalAgreementDate: provider.originalAgreementDate,
    organizationName: provider.organizationName && provider.organizationName.trim() !== '' ? provider.organizationName : 'Default Organization',
    organizationId: provider.organizationId && provider.organizationId.trim() !== '' ? provider.organizationId : 'default-org-id',
    startDate: provider.startDate,
    contractTerm: provider.contractTerm,
    ptoDays: provider.ptoDays,
    holidayDays: provider.holidayDays,
    cmeDays: provider.cmeDays,
    cmeAmount: provider.cmeAmount,
    signingBonus: provider.signingBonus,
    educationBonus: provider.educationBonus,
    qualityBonus: provider.qualityBonus,
    compensationType: provider.compensationModel || null,
    conversionFactor: provider.conversionFactor || null,
    wRVUTarget: provider.wRVUTarget || null,
    compensationYear: provider.compensationYear || null,
    credentials: provider.credentials,
    dynamicFields: typeof provider.dynamicFields === 'string' ? provider.dynamicFields : null,
  };

  return input;
}

// Simulate the filtering logic
function simulateFiltering(input) {
  // Remove null/undefined values
  const finalInput = Object.fromEntries(
    Object.entries(input).filter(([key, value]) => value !== null && value !== undefined)
  );
  
  return finalInput;
}

// Run the simulation
console.log('🔄 Step 1: Parse CSV row');
const parsedProvider = simulateParsing(csvRow);
console.log('Parsed provider:', JSON.stringify(parsedProvider, null, 2));

console.log('\n🔄 Step 2: Transform to CreateProviderInput');
const transformedInput = simulateTransformation(parsedProvider);
console.log('Transformed input:', JSON.stringify(transformedInput, null, 2));

console.log('\n🔄 Step 3: Filter null/undefined values');
const filteredInput = simulateFiltering(transformedInput);
console.log('Filtered input:', JSON.stringify(filteredInput, null, 2));

// Check for issues
console.log('\n🔍 Analysis:');

// Check required fields
const requiredFields = ['id', 'name', 'organizationName', 'organizationId'];
const missingFields = requiredFields.filter(field => !filteredInput[field]);

if (missingFields.length > 0) {
  console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
} else {
  console.log('✅ All required fields present');
}

// Check for null/undefined values
const nullFields = Object.entries(filteredInput).filter(([key, value]) => 
  value === null || value === undefined
);

if (nullFields.length > 0) {
  console.log(`❌ Found null/undefined fields: ${nullFields.map(([k, v]) => `${k}=${v}`).join(', ')}`);
} else {
  console.log('✅ No null/undefined fields');
}

// Check specific fields that might be causing issues
console.log('\n🔍 Specific field analysis:');
console.log(`name: "${filteredInput.name}" (type: ${typeof filteredInput.name})`);
console.log(`organizationName: "${filteredInput.organizationName}" (type: ${typeof filteredInput.organizationName})`);
console.log(`organizationId: "${filteredInput.organizationId}" (type: ${typeof filteredInput.organizationId})`);
console.log(`compensationType: ${filteredInput.compensationType} (type: ${typeof filteredInput.compensationType})`);
console.log(`conversionFactor: ${filteredInput.conversionFactor} (type: ${typeof filteredInput.conversionFactor})`);
console.log(`wRVUTarget: ${filteredInput.wRVUTarget} (type: ${typeof filteredInput.wRVUTarget})`);
console.log(`compensationYear: ${filteredInput.compensationYear} (type: ${typeof filteredInput.compensationYear})`);

console.log('\n🎯 Conclusion:');
console.log('This simulation should help identify where null values are being introduced.');
console.log('If this simulation works but the real app doesn\'t, there might be a difference in the data or logic.'); 