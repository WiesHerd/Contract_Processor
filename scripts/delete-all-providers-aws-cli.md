# Delete All Providers Using AWS CLI

## Prerequisites
Make sure you have AWS CLI installed and configured with proper permissions.

## Step 1: List All Providers
```bash
aws dynamodb scan \
  --table-name Provider-afojsp5awna3pmnifv4vo22j3y-production \
  --region us-east-2 \
  --output json > providers.json
```

## Step 2: Delete All Providers
```bash
# Read the providers.json file and delete each one
jq -r '.Items[].id.S' providers.json | while read id; do
  aws dynamodb delete-item \
    --table-name Provider-afojsp5awna3pmnifv4vo22j3y-production \
    --key "{\"id\":{\"S\":\"$id\"}}" \
    --region us-east-2
  echo "Deleted provider: $id"
done
```

## Step 3: Verify Deletion
```bash
aws dynamodb scan \
  --table-name Provider-afojsp5awna3pmnifv4vo22j3y-production \
  --region us-east-2 \
  --select COUNT
```

This should return a count of 0 if all providers were deleted successfully.

## Next Steps
After deleting all providers:
1. Go to your app
2. Navigate to the /providers screen  
3. Upload your original CSV file
4. All providers will be created with your current user as the owner 