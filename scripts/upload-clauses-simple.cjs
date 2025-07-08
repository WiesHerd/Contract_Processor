require('dotenv/config');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// AWS Configuration
const region = process.env.VITE_AWS_REGION;
const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error('❌ Missing AWS configuration. Please set VITE_AWS_REGION, VITE_AWS_ACCESS_KEY_ID, and VITE_AWS_SECRET_ACCESS_KEY in your .env file.');
  process.exit(1);
}

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Get table name from environment
const tableName = process.env.VITE_AWS_DYNAMODB_CLAUSE_TABLE_NAME;
if (!tableName) {
  console.error('❌ Missing table name. Please set VITE_AWS_DYNAMODB_CLAUSE_TABLE_NAME in your .env file.');
  process.exit(1);
}

// Static clause data
const CLAUSES = [
  {
    id: 'noncompete',
    title: 'Non-Compete Clause',
    content: 'The Physician agrees not to engage in any competing practice within 25 miles of {{OrganizationName}} for a period of {{NonCompeteTerm}} years after termination.',
    type: 'standard',
    category: 'restrictive',
    tags: ['non-compete', 'restrictive'],
    applicableProviderTypes: ['physician'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'malpractice',
    title: 'Malpractice Insurance Clause',
    content: 'Employer shall provide malpractice insurance coverage, including tail coverage, for the Physician during the term of employment.',
    type: 'standard',
    category: 'benefits',
    tags: ['insurance', 'malpractice'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'termination',
    title: 'Termination Clause',
    content: 'Either party may terminate this Agreement with {{NoticePeriod}} days written notice.',
    type: 'standard',
    category: 'termination',
    tags: ['termination', 'notice'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'moonlighting',
    title: 'Moonlighting Clause',
    content: 'The Physician may not engage in outside employment (moonlighting) without prior written approval from Employer.',
    type: 'standard',
    category: 'restrictive',
    tags: ['moonlighting', 'restrictive'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'callcoverage',
    title: 'Call Coverage Clause',
    content: 'The Physician shall participate in call coverage as scheduled by Employer and shall receive compensation as outlined in Schedule B.',
    type: 'standard',
    category: 'compensation',
    tags: ['call', 'duties'],
    applicableProviderTypes: ['physician'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'relocation',
    title: 'Relocation Repayment Clause',
    content: 'If the Physician voluntarily terminates employment within 24 months of start date, any relocation bonus paid must be repaid in full.',
    type: 'standard',
    category: 'compensation',
    tags: ['relocation', 'repayment'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'signingbonus',
    title: 'Signing Bonus Repayment Clause',
    content: 'If the Physician voluntarily terminates employment within 12 months of start date, any signing bonus paid must be repaid in full.',
    type: 'standard',
    category: 'compensation',
    tags: ['signing-bonus', 'repayment'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'cme',
    title: 'CME Allowance Clause',
    content: 'The Physician shall be entitled to reimbursement for continuing medical education expenses up to $3,000 per contract year.',
    type: 'standard',
    category: 'benefits',
    tags: ['cme', 'education'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'pto',
    title: 'PTO Policy Clause',
    content: 'The Physician shall be entitled to 20 business days of paid time off per contract year, in addition to 8 paid holidays.',
    type: 'standard',
    category: 'benefits',
    tags: ['pto', 'time-off'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'telemedicine',
    title: 'Telemedicine Clause',
    content: 'The Physician may provide telemedicine services as approved by Employer and in accordance with applicable laws.',
    type: 'standard',
    category: 'other',
    tags: ['telemedicine', 'duties'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'fmv',
    title: 'FMV Exception/Override Clause',
    content: 'All compensation described herein has been determined to be consistent with fair market value for the services provided and is commercially reasonable.',
    type: 'standard',
    category: 'compensation',
    tags: ['fmv', 'compensation'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'retention',
    title: 'Retention Bonus Clause',
    content: 'The Physician shall be eligible for a retention bonus as outlined in Schedule B, subject to continued employment.',
    type: 'standard',
    category: 'compensation',
    tags: ['retention', 'bonus'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'productivity',
    title: 'Productivity Incentive Clause',
    content: 'The Physician shall be eligible for productivity-based compensation as described in Schedule B.',
    type: 'standard',
    category: 'compensation',
    tags: ['productivity', 'incentive'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['productivity', 'hybrid'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  },
  {
    id: 'restrictive',
    title: 'Restrictive Covenant Clause',
    content: 'The Physician agrees to abide by all confidentiality, non-solicitation, and non-disparagement provisions as set forth in this Agreement.',
    type: 'standard',
    category: 'restrictive',
    tags: ['restrictive', 'covenant'],
    applicableProviderTypes: ['physician', 'advanced-practitioner'],
    applicableCompensationModels: ['base', 'productivity', 'hybrid', 'hospitalist', 'leadership'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  }
];

async function uploadClauses() {
  let success = 0;
  let failed = 0;
  
  console.log('🚀 Starting clause upload to DynamoDB...');
  console.log(`📋 Found ${CLAUSES.length} clauses to upload`);
  console.log(`🗄️  Target table: ${tableName}`);
  console.log('');
  
  for (const clause of CLAUSES) {
    try {
      // Map to DynamoDB item format
      const item = {
        id: clause.id,
        text: clause.content,
        tags: clause.tags,
        condition: clause.conditions?.[0]?.value || null,
        createdAt: clause.createdAt,
        updatedAt: clause.updatedAt,
        __typename: 'Clause'
      };
      
      const command = new PutCommand({
        TableName: tableName,
        Item: item
      });
      
      await docClient.send(command);
      console.log(`✅ Uploaded: ${clause.title}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed to upload: ${clause.title}`, err.message);
      failed++;
    }
  }
  
  console.log('');
  console.log(`📊 Upload complete. Success: ${success}, Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some clauses failed to upload. Check the errors above.');
  } else {
    console.log('\n🎉 All clauses uploaded successfully!');
  }
}

uploadClauses().catch(err => {
  console.error('❌ Migration script failed:', err);
  process.exit(1);
}); 