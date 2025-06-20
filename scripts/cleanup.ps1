# Set AWS credentials from environment file
$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line.StartsWith("VITE_AWS_")) {
        $key = $line.Split("=")[0].Replace("VITE_", "")
        $value = $line.Split("=")[1]
        [Environment]::SetEnvironmentVariable($key, $value)
    }
}

# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-2"

Write-Host "Starting cleanup..."
$tableName = "Provider-uncqgyngxvgzfceslcwqtprza4-dev"

# Get all items
Write-Host "Fetching items..."
$items = aws dynamodb scan --table-name $tableName --attributes-to-get "id" --query "Items[*].id.S" --output json | ConvertFrom-Json

if ($items.Count -eq 0) {
    Write-Host "No items found to delete."
    exit 0
}

Write-Host "Found $($items.Count) items to delete."
$deleted = 0

# Delete items in batches of 25
for ($i = 0; $i -lt $items.Count; $i += 25) {
    $batch = $items[$i..([Math]::Min($i + 24, $items.Count - 1))]
    Write-Host "Deleting batch $($i / 25 + 1) of $([Math]::Ceiling($items.Count / 25))..."
    
    foreach ($id in $batch) {
        aws dynamodb delete-item --table-name $tableName --key "{""id"":{""S"":""$id""}}"
        $deleted++
        Write-Host "Progress: $deleted/$($items.Count) items deleted"
    }
} 