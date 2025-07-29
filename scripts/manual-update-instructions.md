# Manual Provider Update Instructions

Since the automated scripts can't access all providers due to authorization restrictions, we need to update them manually through the AWS Console.

## Step 1: Access DynamoDB Console

1. Go to [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Make sure you're in the **us-east-2** region
3. Click on **Tables** in the left sidebar
4. Find the table named `Provider-afojsp5awna3pmnifv4vo22j3y-production`
5. Click on the table name

## Step 2: Update Provider Owners

1. Click on **Explore items** in the left sidebar
2. You should see all 1,000 providers listed
3. For each provider that needs updating:
   - Click on the provider row
   - Look for the `owner` field
   - Change the value to: `015b7590-30c1-70ad-c9a8-4464794a1aed`
   - Click **Save**

## Step 3: Batch Update (Recommended)

Instead of updating one by one, you can use the AWS CLI or a script. Here's a PowerShell script to help:

```powershell
# Install AWS CLI if you haven't already
# Then run this script

$tableName = "Provider-afojsp5awna3pmnifv4vo22j3y-production"
$newOwner = "015b7590-30c1-70ad-c9a8-4464794a1aed"

# First, scan all providers to get their IDs
aws dynamodb scan --table-name $tableName --region us-east-2 --output json > providers.json

# Then update each provider (this is a simplified example)
# You would need to parse the JSON and update each item
```

## Alternative: Use AWS CLI

If you have AWS CLI configured with proper permissions:

```bash
# List all providers
aws dynamodb scan --table-name Provider-afojsp5awna3pmnifv4vo22j3y-production --region us-east-2

# Update a specific provider (replace PROVIDER_ID with actual ID)
aws dynamodb update-item \
  --table-name Provider-afojsp5awna3pmnifv4vo22j3y-production \
  --key '{"id":{"S":"PROVIDER_ID"}}' \
  --update-expression "SET #owner = :owner" \
  --expression-attribute-names '{"#owner":"owner"}' \
  --expression-attribute-values '{":owner":{"S":"015b7590-30c1-70ad-c9a8-4464794a1aed"}}' \
  --region us-east-2
```

## Step 4: Verify the Update

After updating the providers:

1. Refresh your browser
2. Navigate to `/providers` in your app
3. You should now see all your providers

## Quick Fix: Update a Few Providers First

If you want to test with just a few providers first:

1. Go to the DynamoDB console
2. Find 5-10 providers that you want to test with
3. Update their `owner` field to: `015b7590-30c1-70ad-c9a8-4464794a1aed`
4. Check if they appear in your app
5. If they do, then update the rest

## Expected Result

After updating the `owner` field for all providers, you should see all 1,000 providers in your app's `/providers` screen.

## Troubleshooting

If you still don't see the providers:

1. Check that the `owner` field was updated correctly
2. Verify you're using the correct user ID: `015b7590-30c1-70ad-c9a8-4464794a1aed`
3. Clear your browser cache and refresh
4. Check the browser console for any errors 