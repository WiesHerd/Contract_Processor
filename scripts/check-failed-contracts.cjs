// scripts/check-failed-contracts.cjs
// USAGE: node scripts/check-failed-contracts.cjs
// This script shows detailed information about failed contracts

const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// DynamoDB table name
const TABLE_NAME = "ContractGenerationLog-afojsp5awna3pmnifv4vo22j3y-production";
const client = new DynamoDBClient({ region: "us-east-2" });

async function checkFailedContracts() {
  console.log('🔍 Checking failed contracts...');
  console.log('📍 Region: us-east-2');
  console.log('📋 Table:', TABLE_NAME);
  console.log('');

  try {
    const scanParams = {
      TableName: TABLE_NAME,
      Limit: 1000
    };

    const result = await client.send(new ScanCommand(scanParams));
    
    if (!result.Items || result.Items.length === 0) {
      console.log('❌ No contract generation logs found');
      return;
    }

    const contracts = result.Items.map(item => unmarshall(item));
    const failedContracts = contracts.filter(contract => contract.status === 'FAILED');
    
    console.log(`📊 Found ${contracts.length} total contracts`);
    console.log(`❌ Found ${failedContracts.length} failed contracts`);
    console.log('');

    if (failedContracts.length === 0) {
      console.log('✅ No failed contracts found!');
      return;
    }

    // Show details of failed contracts
    console.log('🔍 Failed Contract Details:');
    console.log('='.repeat(80));
    
    failedContracts.slice(0, 10).forEach((contract, index) => {
      console.log(`\n${index + 1}. Contract ID: ${contract.id}`);
      console.log(`   Provider: ${contract.providerName || contract.providerId}`);
      console.log(`   Template: ${contract.templateId}`);
      console.log(`   Generated: ${new Date(contract.generatedAt).toLocaleString()}`);
      console.log(`   Notes: ${contract.notes || 'No notes'}`);
      
      // Try to parse notes for error details
      if (contract.notes) {
        if (contract.notes.includes('Immutable storage failed')) {
          console.log(`   ❌ Error: S3 upload failed - contract not stored permanently`);
        } else if (contract.notes.includes('Failed to generate')) {
          console.log(`   ❌ Error: Document generation failed`);
        } else {
          console.log(`   ❌ Error: ${contract.notes}`);
        }
      }
    });

    if (failedContracts.length > 10) {
      console.log(`\n... and ${failedContracts.length - 10} more failed contracts`);
    }

    console.log('\n💡 To fix these:');
    console.log('   1. Use the "Reprocess All" button in the UI');
    console.log('   2. Or manually regenerate contracts for specific providers');
    console.log('   3. Check that S3 credentials and permissions are correct');
    console.log('');

    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error checking failed contracts:', error);
  }
}

checkFailedContracts(); 