// Node.js script to remove unwanted fields from all provider records in DynamoDB
const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = 'Provider-afojsp5awna3pmnifv4vo22j3y-production';
const REGION = 'us-east-2';

const FIELDS_TO_REMOVE = [
  'Education Bonus',
  'Compensation Model',
  'Template Tag',
  'dynamicFields',
];

const client = new DynamoDBClient({ region: REGION });

async function removeFieldsFromAllProviders() {
  let lastEvaluatedKey = undefined;
  let updatedCount = 0;
  do {
    const scanParams = {
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    const scanResult = await client.send(new ScanCommand(scanParams));
    for (const item of scanResult.Items) {
      // Check if any unwanted field exists
      const fieldsPresent = FIELDS_TO_REMOVE.filter(field => item[field] !== undefined);
      if (fieldsPresent.length > 0) {
        // Build UpdateExpression to remove fields
        const updateParams = {
          TableName: TABLE_NAME,
          Key: { id: item.id },
          UpdateExpression: 'REMOVE ' + fieldsPresent.map(f => `#${f.replace(/\W/g, '')}`).join(', '),
          ExpressionAttributeNames: Object.fromEntries(fieldsPresent.map(f => [`#${f.replace(/\W/g, '')}`, f])),
        };
        await client.send(new UpdateItemCommand(updateParams));
        updatedCount++;
        console.log(`Updated provider id: ${item.id.S} - removed: ${fieldsPresent.join(', ')}`);
      }
    }
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  console.log(`\nCleanup complete. Total records updated: ${updatedCount}`);
}

removeFieldsFromAllProviders().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
}); 