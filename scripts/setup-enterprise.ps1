# Enterprise Setup Script for ContractEngine (PowerShell)
# This script helps deploy the enterprise-grade multi-organization solution

param(
    [string]$UserPassword,
    [string]$UserEmail = "wherdzik@gmail.com"
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Enterprise Setup for ContractEngine" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Amplify CLI is installed
function Test-AmplifyCLI {
    try {
        $null = Get-Command amplify -ErrorAction Stop
        Write-Success "Amplify CLI is installed"
    }
    catch {
        Write-Error "Amplify CLI is not installed. Please install it first:"
        Write-Host "npm install -g @aws-amplify/cli" -ForegroundColor White
        exit 1
    }
}

# Check if user is authenticated
function Test-AmplifyAuth {
    try {
        $null = amplify auth status 2>$null
        Write-Success "Amplify authentication verified"
    }
    catch {
        Write-Error "You are not authenticated with Amplify. Please run:"
        Write-Host "amplify configure" -ForegroundColor White
        exit 1
    }
}

# Deploy the updated schema
function Deploy-Schema {
    Write-Status "Deploying updated schema..."
    
    try {
        amplify push --yes
        Write-Success "Schema deployed successfully"
    }
    catch {
        Write-Error "Schema deployment failed"
        exit 1
    }
}

# Run the migration script
function Run-Migration {
    Write-Status "Running data migration..."
    
    if ([string]::IsNullOrEmpty($UserPassword)) {
        Write-Warning "USER_PASSWORD parameter is not set"
        Write-Host "Please run with: .\scripts\setup-enterprise.ps1 -UserPassword 'your-password'" -ForegroundColor White
        Write-Host "Or set environment variable: `$env:USER_PASSWORD='your-password'" -ForegroundColor White
        Write-Host "Then run: node scripts/migrate-to-enterprise-schema.js" -ForegroundColor White
        return
    }
    
    # Set environment variable for the migration script
    $env:USER_PASSWORD = $UserPassword
    
    try {
        node scripts/migrate-to-enterprise-schema.js
        Write-Success "Migration completed successfully"
    }
    catch {
        Write-Error "Migration failed"
        exit 1
    }
}

# Create Cognito groups
function Setup-CognitoGroups {
    Write-Status "Setting up Cognito groups..."
    
    # Get the user pool ID from aws-exports
    try {
        $awsExports = Get-Content "src/aws-exports.js" -Raw
        $userPoolId = $awsExports -replace '(?s).*"aws_user_pools_id":\s*"([^"]+)".*', '$1'
        
        if ([string]::IsNullOrEmpty($userPoolId) -or $userPoolId -eq $awsExports) {
            throw "Could not extract user pool ID"
        }
        
        Write-Status "User Pool ID: $userPoolId"
        
        # Create Admin group
        Write-Status "Creating Admin group..."
        try {
            aws cognito-idp create-group --user-pool-id $userPoolId --group-name "Admin" --description "Global administrators" --precedence 1
            Write-Success "Admin group created"
        }
        catch {
            Write-Warning "Admin group may already exist"
        }
        
        # Create default organization groups
        Write-Status "Creating default organization groups..."
        try {
            aws cognito-idp create-group --user-pool-id $userPoolId --group-name "DefaultOrg-Members" --description "Default organization members" --precedence 10
            Write-Success "DefaultOrg-Members group created"
        }
        catch {
            Write-Warning "DefaultOrg-Members group may already exist"
        }
        
        try {
            aws cognito-idp create-group --user-pool-id $userPoolId --group-name "DefaultOrg-Admins" --description "Default organization admins" --precedence 5
            Write-Success "DefaultOrg-Admins group created"
        }
        catch {
            Write-Warning "DefaultOrg-Admins group may already exist"
        }
        
        Write-Success "Cognito groups created"
    }
    catch {
        Write-Error "Failed to setup Cognito groups: $($_.Exception.Message)"
        exit 1
    }
}

# Add current user to Admin group
function Add-UserToAdmin {
    Write-Status "Adding current user to Admin group..."
    
    try {
        $awsExports = Get-Content "src/aws-exports.js" -Raw
        $userPoolId = $awsExports -replace '(?s).*"aws_user_pools_id":\s*"([^"]+)".*', '$1'
        
        aws cognito-idp admin-add-user-to-group --user-pool-id $userPoolId --username $UserEmail --group-name "Admin"
        Write-Success "User added to Admin group"
    }
    catch {
        Write-Warning "User may already be in Admin group or operation failed"
    }
}

# Show next steps
function Show-NextSteps {
    Write-Host ""
    Write-Host "🎉 Enterprise setup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Test the application: npm run dev" -ForegroundColor White
    Write-Host "2. Create additional organizations as needed" -ForegroundColor White
    Write-Host "3. Add users to appropriate Cognito groups" -ForegroundColor White
    Write-Host "4. Review the documentation: docs/ENTERPRISE_SOLUTION.md" -ForegroundColor White
    Write-Host ""
    Write-Host "For additional organizations:" -ForegroundColor White
    Write-Host "- Create Cognito groups: {OrgName}-Members, {OrgName}-Admins" -ForegroundColor White
    Write-Host "- Add users to appropriate groups" -ForegroundColor White
    Write-Host "- Create organization records in the app" -ForegroundColor White
    Write-Host ""
}

# Main execution
function Main {
    Write-Status "Starting enterprise setup..."
    
    # Pre-flight checks
    Test-AmplifyCLI
    Test-AmplifyAuth
    
    # Deploy schema
    Deploy-Schema
    
    # Setup Cognito groups
    Setup-CognitoGroups
    
    # Add user to admin group
    Add-UserToAdmin
    
    # Run migration (if password is provided)
    if (-not [string]::IsNullOrEmpty($UserPassword)) {
        Run-Migration
    }
    else {
        Write-Warning "Skipping migration - UserPassword not provided"
        Write-Host "To run migration later:" -ForegroundColor White
        Write-Host "`$env:USER_PASSWORD='your-password'" -ForegroundColor White
        Write-Host "node scripts/migrate-to-enterprise-schema.js" -ForegroundColor White
    }
    
    # Show next steps
    Show-NextSteps
}

# Run main function
Main 