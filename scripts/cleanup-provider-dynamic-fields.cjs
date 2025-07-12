const AWS = require('aws-sdk');

// Set your region and table name here
const REGION = 'us-east-2'; // Change if needed
const TABLE_NAME = 'Provider-afojsp5awna3pmnifv4vo22j3y-production';

// Updated schema fields based on the new providerSchema.ts
const SCHEMA_FIELDS = [
  'id', 'compensationYear', 'employeeId', 'name', 'providerType', 'specialty', 'subspecialty', 
  'positionTitle', 'yearsExperience', 'hourlyWage', 'baseSalary', 'originalAgreementDate', 
  'organizationName', 'startDate', 'contractTerm', 'ptoDays', 'holidayDays', 'cmeDays', 
  'cmeAmount', 'signingBonus', 'relocationBonus', 'qualityBonus', 'compensationType', 
  'conversionFactor', 'wRVUTarget', 'credentials', 'clinicalFTE', 'medicalDirectorFTE', 
  'divisionChiefFTE', 'researchFTE', 'teachingFTE', 'totalFTE', 'fte', 'administrativeFte', 
  'administrativeRole', 'educationBonus', 'compensationModel', 'fteBreakdown', 'templateTag', 
  'dynamicFields', 'createdAt', 'updatedAt', 'owner', '__typename'
];

// Additional field variants that might appear in dynamicFields
const FIELD_VARIANTS = {
  'Provider Name': 'name',
  'Employee ID': 'employeeId',
  'Provider Type': 'providerType',
  'Position Title': 'positionTitle',
  'Years of Experience': 'yearsExperience',
  'Hourly Wage': 'hourlyWage',
  'Base Salary': 'baseSalary',
  'BaseSalary': 'baseSalary',
  'Original Agreement Date': 'originalAgreementDate',
  'OriginalAgreementDate': 'originalAgreementDate',
  'Organization Name': 'organizationName',
  'OrganizationName': 'organizationName',
  'Start Date': 'startDate',
  'StartDate': 'startDate',
  'Contract Term': 'contractTerm',
  'ContractTerm': 'contractTerm',
  'PTO Days': 'ptoDays',
  'PTODays': 'ptoDays',
  'Holiday Days': 'holidayDays',
  'HolidayDays': 'holidayDays',
  'CME Days': 'cmeDays',
  'CMEDays': 'cmeDays',
  'CME Amount': 'cmeAmount',
  'CMEAmount': 'cmeAmount',
  'Signing Bonus': 'signingBonus',
  'SigningBonus': 'signingBonus',
  'Relocation Bonus': 'relocationBonus',
  'RelocationBonus': 'relocationBonus',
  'Quality Bonus': 'qualityBonus',
  'QualityBonus': 'qualityBonus',
  'Compensation Type': 'compensationType',
  'Conversion Factor': 'conversionFactor',
  'ConversionFactor': 'conversionFactor',
  'wRVU Target': 'wRVUTarget',
  'wRVUTarget': 'wRVUTarget',
  'Compensation Year': 'compensationYear',
  'Clinical FTE': 'clinicalFTE',
  'ClinicalFTE': 'clinicalFTE',
  'Medical Director FTE': 'medicalDirectorFTE',
  'MedicalDirectorFTE': 'medicalDirectorFTE',
  'Division Chief FTE': 'divisionChiefFTE',
  'DivisionChiefFTE': 'divisionChiefFTE',
  'Research FTE': 'researchFTE',
  'ResearchFTE': 'researchFTE',
  'Teaching FTE': 'teachingFTE',
  'TeachingFTE': 'teachingFTE',
  'Total FTE': 'totalFTE',
  'TotalFTE': 'totalFTE',
  'FTE': 'fte',
  'Administrative FTE': 'administrativeFte',
  'Administrative Role': 'administrativeRole',
  'Education Bonus': 'educationBonus',
  'EducationBonus': 'educationBonus',
  'Credentials': 'credentials'
};

// Normalization function (matches frontend)
function normalizeFieldName(fieldName) {
  return fieldName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

const normalizedSchemaFields = SCHEMA_FIELDS.map(normalizeFieldName);

// Check if a dynamic field key corresponds to a schema field
function isSchemaField(dynamicFieldKey) {
  // Direct match
  if (FIELD_VARIANTS[dynamicFieldKey]) {
    return true;
  }
  
  // Normalized match
  const normalized = normalizeFieldName(dynamicFieldKey);
  return normalizedSchemaFields.includes(normalized);
}

AWS.config.update({ region: REGION });
const dynamo = new AWS.DynamoDB.DocumentClient();

async function scanAllItems() {
  let items = [];
  let params = { TableName: TABLE_NAME };
  let lastKey = null;
  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const data = await dynamo.scan(params).promise();
    items = items.concat(data.Items);
    lastKey = data.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function cleanup() {
  const items = await scanAllItems();
  let cleaned = 0, skipped = 0;
  let totalDuplicatesRemoved = 0;

  console.log(`Found ${items.length} providers to analyze`);

  for (const item of items) {
    let changed = false;
    let dynamicFields = item.dynamicFields;

    // Parse if stringified
    if (typeof dynamicFields === 'string') {
      try {
        dynamicFields = JSON.parse(dynamicFields);
      } catch {
        dynamicFields = {};
      }
    }
    if (!dynamicFields || typeof dynamicFields !== 'object') {
      skipped++;
      continue;
    }

    // Remove keys that match schema fields
    const newDynamicFields = {};
    let duplicatesInThisProvider = 0;
    
    for (const [key, value] of Object.entries(dynamicFields)) {
      if (isSchemaField(key)) {
        changed = true;
        duplicatesInThisProvider++;
        console.log(`Removing duplicate dynamic field '${key}' from provider ${item.id || item.employeeId} (maps to schema field)`);
      } else {
        newDynamicFields[key] = value;
      }
    }

    if (changed) {
      // Update the item in DynamoDB
      const updateParams = {
        TableName: TABLE_NAME,
        Key: { id: item.id }, // Change if your PK is different
        UpdateExpression: 'set dynamicFields = :df',
        ExpressionAttributeValues: { 
          ':df': Object.keys(newDynamicFields).length > 0 ? JSON.stringify(newDynamicFields) : null 
        }
      };
      
      await dynamo.update(updateParams).promise();
      cleaned++;
      totalDuplicatesRemoved += duplicatesInThisProvider;
      console.log(`✅ Cleaned provider ${item.id || item.employeeId}: removed ${duplicatesInThisProvider} duplicate fields`);
    } else {
      skipped++;
    }
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`✅ Providers cleaned: ${cleaned}`);
  console.log(`⏭️  Providers skipped: ${skipped}`);
  console.log(`🗑️  Total duplicate fields removed: ${totalDuplicatesRemoved}`);
  console.log('\n🎉 Cleanup complete! All schema fields are now stored as top-level DynamoDB attributes.');
}

cleanup().catch(console.error);