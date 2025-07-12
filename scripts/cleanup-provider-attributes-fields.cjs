// Node.js script to remove unwanted keys from the 'attributes' map in all provider records in DynamoDB
const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = 'Provider-afojsp5awna3pmnifv4vo22j3y-production';
const REGION = 'us-east-2';

const ATTR_KEYS_TO_REMOVE = [
  'Compensation Model',
  'Template Tag',
  'Dynamic Fields',
];

const client = new DynamoDBClient({ region: REGION });

async function removeKeysFromAttributes() {
  let lastEvaluatedKey = undefined;
  let updatedCount = 0;
  do {
    const scanParams = {
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    const scanResult = await client.send(new ScanCommand(scanParams));
    for (const item of scanResult.Items) {
      if (!item.attributes || item.attributes.M === undefined) continue;
      const attrMap = item.attributes.M;
      const keysPresent = ATTR_KEYS_TO_REMOVE.filter(key => attrMap[key] !== undefined);
      if (keysPresent.length > 0) {
        // Build UpdateExpression to remove keys from attributes
        const updateParams = {
          TableName: TABLE_NAME,
          Key: { id: item.id },
          UpdateExpression: 'REMOVE ' + keysPresent.map(k => `attributes.#${k.replace(/\W/g, '')}`).join(', '),
          ExpressionAttributeNames: Object.fromEntries(keysPresent.map(k => [`#${k.replace(/\W/g, '')}`, k])),
        };
        await client.send(new UpdateItemCommand(updateParams));
        updatedCount++;
        console.log(`Updated provider id: ${item.id.S} - removed from attributes: ${keysPresent.join(', ')}`);
      }
    }
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  console.log(`\nCleanup complete. Total records updated: ${updatedCount}`);
}

removeKeysFromAttributes().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
}); 