import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import awsconfig from '../src/aws-exports.js';

// Configure Amplify
const config = {
  ...awsconfig,
  API: {
    GraphQL: {
      endpoint: awsconfig.aws_appsync_graphqlEndpoint,
      region: awsconfig.aws_appsync_region,
      defaultAuthMode: 'apiKey',
      apiKey: awsconfig.aws_appsync_apiKey
    }
  }
};

console.log('Configuring with:', {
  endpoint: config.API.GraphQL.endpoint,
  region: config.API.GraphQL.region,
  apiKey: config.API.GraphQL.apiKey?.slice(0, 5) + '...'
});

Amplify.configure(config);

// GraphQL operations
const listProviders = /* GraphQL */ `
  query ListProviders($limit: Int, $nextToken: String) {
    listProviders(limit: $limit, nextToken: $nextToken) {
      items {
        id
      }
      nextToken
    }
  }
`;

const deleteProvider = /* GraphQL */ `
  mutation DeleteProvider($input: DeleteProviderInput!) {
    deleteProvider(input: $input) {
      id
    }
  }
`;

// Initialize client
const client = generateClient();

async function deleteAllProviders() {
  console.log('Starting provider cleanup...');
  let totalDeleted = 0;
  let nextToken = null;

  try {
    do {
      // Get batch of providers
      console.log('\nFetching next batch of providers...');
      const result = await client.graphql({
        query: listProviders,
        variables: {
          limit: 1000,
          nextToken
        }
      });

      const providers = result.data.listProviders.items;
      nextToken = result.data.listProviders.nextToken;

      if (providers.length === 0) {
        console.log('No more providers to delete.');
        break;
      }

      console.log(`Found ${providers.length} providers to delete...`);

      // Delete providers in chunks of 25
      const chunks = [];
      for (let i = 0; i < providers.length; i += 25) {
        chunks.push(providers.slice(i, i + 25));
      }

      for (const chunk of chunks) {
        console.log(`Deleting chunk of ${chunk.length} providers...`);
        
        await Promise.all(
          chunk.map(provider =>
            client.graphql({
              query: deleteProvider,
              variables: {
                input: { id: provider.id }
              }
            }).catch(err => {
              console.warn(`Failed to delete provider ${provider.id}:`, err);
              return null;
            })
          )
        );

        totalDeleted += chunk.length;
        console.log(`Progress: ${totalDeleted}/${providers.length} providers deleted in this batch`);
      }

    } while (nextToken);

    console.log(`\nCleanup complete! Successfully deleted ${totalDeleted} providers total.`);

  } catch (error) {
    console.error('Error:', error);
    if (error.errors) {
      console.error('GraphQL Errors:', error.errors);
    }
    process.exit(1);
  }
}

// Run the cleanup
deleteAllProviders(); 