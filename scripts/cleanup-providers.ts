import { awsBulkOperations } from '../src/utils/awsServices.js';
import { Amplify } from 'aws-amplify';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
Amplify.configure(awsconfig);

async function cleanupProviders() {
  try {
    console.log('Starting provider cleanup...');
    await awsBulkOperations.deleteAllProviders();
    console.log('Successfully deleted all providers');
  } catch (error) {
    console.error('Error deleting providers:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupProviders(); 