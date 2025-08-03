import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'dotenv';

// Load environment variables

config();

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.VITE_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function fixClauseOwners() {
  const tableName = 'Clause-afojsp5awna3pmnifv4vo22j3y-production'; // Your clause table name
  const targetOwner = 'wherdzik@gmail.com'; // Your current user email
  
  console.log(`Scanning table: ${tableName}`);
  console.log(`Target owner: ${targetOwner}`);
  console.log(`AWS Region: ${process.env.VITE_AWS_REGION}`);
  console.log(`Access Key ID: ${process.env.VITE_AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);

  try {
    // Scan all clauses
    const scanParams = {
      TableName: tableName,
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const clauses = scanResult.Items || [];

    console.log(`Found ${clauses.length} clauses in DynamoDB`);

    // Update each clause to have the correct owner
    let updatedCount = 0;
    for (const clause of clauses) {
      if (clause.owner !== targetOwner) {
        console.log(`Updating clause ${clause.id} from owner "${clause.owner}" to "${targetOwner}"`);
        
        const updateParams = {
          TableName: tableName,
          Key: { id: clause.id },
          UpdateExpression: 'SET #owner = :owner',
          ExpressionAttributeNames: {
            '#owner': 'owner',
          },
          ExpressionAttributeValues: {
            ':owner': targetOwner,
          },
        };

        await docClient.send(new UpdateCommand(updateParams));
        updatedCount++;
      } else {
        console.log(`Clause ${clause.id} already has correct owner: ${clause.owner}`);
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`Total clauses: ${clauses.length}`);
    console.log(`Updated clauses: ${updatedCount}`);
    console.log(`Already correct: ${clauses.length - updatedCount}`);

  } catch (error) {
    console.error('Error fixing clause owners:', error);
  }
}

// Run the script
fixClauseOwners().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
}); 