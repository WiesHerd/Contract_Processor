import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// AWS Configuration
const s3Client = new S3Client({ region: 'us-east-2' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-2' });

const BUCKET_NAME = 'contractengine-storage-wherdzik';
const CONTRACTS_PREFIX = 'contracts/immutable/';
const TABLE_NAME = 'ContractGenerationLog-afojsp5awna3pmnifv4vo22j3y-production';

async function checkDynamoDBvsS3() {
  try {
    console.log('🔍 Comparing DynamoDB logs with S3 files...\n');

    // Get S3 files
    console.log('📁 Scanning S3...');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: CONTRACTS_PREFIX,
    });
    
    const s3Response = await s3Client.send(listCommand);
    const s3Files = s3Response.Contents || [];
    
    console.log(`✅ Found ${s3Files.length} files in S3`);

    // Get DynamoDB logs
    console.log('🗄️ Scanning DynamoDB...');
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1000
    });
    
    const dynamoResponse = await dynamoClient.send(scanCommand);
    const dynamoLogs = (dynamoResponse.Items || []).map(item => unmarshall(item));
    
    console.log(`✅ Found ${dynamoLogs.length} logs in DynamoDB\n`);

    // Analyze the data
    console.log('📊 Analysis:');
    console.log('='.repeat(50));

    // Check for S3 files without DynamoDB logs
    const s3ContractIds = s3Files.map(obj => {
      const pathParts = obj.Key.split('/');
      return pathParts[2]; // contractId is the 3rd part
    });

    const dynamoContractIds = dynamoLogs.map(log => {
      // Reconstruct contract ID from DynamoDB data
      return `${log.providerId}-${log.templateId}-${log.contractYear}`;
    });

    console.log('🔍 S3 Contract IDs:');
    s3ContractIds.forEach(id => console.log(`   - ${id}`));
    
    console.log('\n🔍 DynamoDB Contract IDs:');
    dynamoContractIds.forEach(id => console.log(`   - ${id}`));

    // Find mismatches
    const s3Only = s3ContractIds.filter(id => !dynamoContractIds.includes(id));
    const dynamoOnly = dynamoContractIds.filter(id => !s3ContractIds.includes(id));
    const matching = s3ContractIds.filter(id => dynamoContractIds.includes(id));

    console.log('\n📊 Results:');
    console.log(`✅ Matching: ${matching.length}`);
    console.log(`📁 S3 Only: ${s3Only.length}`);
    console.log(`🗄️ DynamoDB Only: ${dynamoOnly.length}`);

    if (s3Only.length > 0) {
      console.log('\n❌ Files in S3 but missing from DynamoDB:');
      s3Only.forEach(id => console.log(`   - ${id}`));
    }

    if (dynamoOnly.length > 0) {
      console.log('\n❌ Logs in DynamoDB but missing from S3:');
      dynamoOnly.forEach(id => console.log(`   - ${id}`));
    }

    // Check status distribution
    const statusCounts = {};
    dynamoLogs.forEach(log => {
      const status = log.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n📊 DynamoDB Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Show recent logs
    console.log('\n📅 Recent DynamoDB Logs (last 5):');
    const recentLogs = dynamoLogs
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 5);
    
    recentLogs.forEach(log => {
      console.log(`   - ${log.providerId} | ${log.status} | ${log.generatedAt}`);
    });

  } catch (error) {
    console.error('❌ Error comparing data:', error);
  }
}

checkDynamoDBvsS3(); 