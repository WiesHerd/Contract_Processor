const { awsClauses } = require('../src/utils/awsServices');

// New Provider Compensation Clauses
const NEW_CLAUSES = [
  {
    id: 'base-compensation',
    title: 'Base Compensation Clause',
    content: 'Provider shall receive an annual base salary of {{BaseSalary}} payable in accordance with Employer\'s standard payroll schedule.',
    tags: ['base-salary', 'compensation'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'productivity-bonus',
    title: 'Productivity Bonus Clause',
    content: 'For wRVUs exceeding {{wRVUTarget}}, Provider shall receive {{ConversionFactor}} per additional wRVU, calculated and paid quarterly.',
    tags: ['productivity', 'wrvu', 'bonus'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fte-assignment',
    title: 'FTE Assignment Clause',
    content: 'Provider shall be assigned {{ClinicalFTE}} clinical FTE and {{AdministrativeFTE}} administrative FTE, with total FTE not exceeding {{TotalFTE}}.',
    tags: ['fte', 'assignment', 'clinical', 'administrative'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'signing-bonus-dynamic',
    title: 'Signing Bonus Clause',
    content: 'Provider shall receive a signing bonus of {{SigningBonus}} payable within 30 days of start date, subject to repayment terms outlined in Section 8.2.',
    tags: ['signing-bonus', 'bonus'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'retention-bonus-dynamic',
    title: 'Retention Bonus Clause',
    content: 'Provider shall be eligible for retention bonus of {{RetentionBonus}} upon completion of {{RetentionPeriod}} of continuous employment.',
    tags: ['retention-bonus', 'bonus'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'confidentiality-static',
    title: 'Confidentiality Agreement',
    content: 'Provider acknowledges and agrees to maintain strict confidentiality of all patient information, business records, and proprietary information of Employer in accordance with HIPAA and other applicable laws.',
    tags: ['confidentiality', 'hipaa'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'termination-notice',
    title: 'Termination Notice Requirements',
    content: 'Either party may terminate this Agreement with 90 days written notice. Provider shall continue to perform all duties during the notice period unless otherwise directed by Employer.',
    tags: ['termination', 'notice'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'professional-liability',
    title: 'Professional Liability Insurance',
    content: 'Employer shall provide professional liability insurance coverage of $1,000,000 per occurrence and $3,000,000 aggregate, including tail coverage upon termination.',
    tags: ['malpractice', 'insurance', 'liability'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cme-requirements',
    title: 'CME Requirements and Allowance',
    content: 'Provider shall complete {{CMEDays}} days of continuing medical education annually and shall be entitled to reimbursement of up to {{CMEAmount}} for approved CME expenses.',
    tags: ['cme', 'education', 'requirements'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'quality-bonus',
    title: 'Quality Performance Bonus',
    content: 'Provider shall be eligible for quality performance bonus of up to {{QualityBonus}} based on achievement of quality metrics as outlined in Schedule C.',
    tags: ['quality', 'bonus', 'performance'],
    condition: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

async function uploadNewClauses() {
  let success = 0;
  let failed = 0;
  
  console.log('🚀 Starting upload of new provider compensation clauses to DynamoDB...');
  console.log(`📋 Found ${NEW_CLAUSES.length} new clauses to upload`);
  console.log('');
  
  for (const clause of NEW_CLAUSES) {
    try {
      // Map to API CreateClauseInput format
      const input = {
        id: clause.id,
        text: clause.content,
        tags: clause.tags,
        condition: clause.condition,
        createdAt: clause.createdAt,
        updatedAt: clause.updatedAt,
      };
      
      await awsClauses.create(input);
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
    console.log('\n🎉 All new clauses uploaded successfully!');
  }
}

// Run the upload
uploadNewClauses().catch(console.error); 