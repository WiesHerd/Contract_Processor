#!/bin/bash

# Enterprise Setup Script for ContractEngine
# This script helps deploy the enterprise-grade multi-organization solution

set -e

echo "🚀 Enterprise Setup for ContractEngine"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Amplify CLI is installed
check_amplify() {
    if ! command -v amplify &> /dev/null; then
        print_error "Amplify CLI is not installed. Please install it first:"
        echo "npm install -g @aws-amplify/cli"
        exit 1
    fi
    print_success "Amplify CLI is installed"
}

# Check if user is authenticated
check_auth() {
    if ! amplify auth status &> /dev/null; then
        print_error "You are not authenticated with Amplify. Please run:"
        echo "amplify configure"
        exit 1
    fi
    print_success "Amplify authentication verified"
}

# Deploy the updated schema
deploy_schema() {
    print_status "Deploying updated schema..."
    
    if amplify push --yes; then
        print_success "Schema deployed successfully"
    else
        print_error "Schema deployment failed"
        exit 1
    fi
}

# Run the migration script
run_migration() {
    print_status "Running data migration..."
    
    # Check if password is set
    if [ -z "$USER_PASSWORD" ]; then
        print_warning "USER_PASSWORD environment variable is not set"
        echo "Please set it: export USER_PASSWORD='your-password'"
        echo "Then run: node scripts/migrate-to-enterprise-schema.js"
        return 1
    fi
    
    if node scripts/migrate-to-enterprise-schema.js; then
        print_success "Migration completed successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

# Create Cognito groups
setup_cognito_groups() {
    print_status "Setting up Cognito groups..."
    
    # Get the user pool ID from aws-exports
    USER_POOL_ID=$(node -e "console.log(require('./src/aws-exports.js').aws_user_pools_id)")
    
    if [ -z "$USER_POOL_ID" ]; then
        print_error "Could not find user pool ID in aws-exports.js"
        exit 1
    fi
    
    print_status "User Pool ID: $USER_POOL_ID"
    
    # Create Admin group
    print_status "Creating Admin group..."
    aws cognito-idp create-group \
        --user-pool-id "$USER_POOL_ID" \
        --group-name "Admin" \
        --description "Global administrators" \
        --precedence 1 || print_warning "Admin group may already exist"
    
    # Create default organization groups
    print_status "Creating default organization groups..."
    aws cognito-idp create-group \
        --user-pool-id "$USER_POOL_ID" \
        --group-name "DefaultOrg-Members" \
        --description "Default organization members" \
        --precedence 10 || print_warning "DefaultOrg-Members group may already exist"
    
    aws cognito-idp create-group \
        --user-pool-id "$USER_POOL_ID" \
        --group-name "DefaultOrg-Admins" \
        --description "Default organization admins" \
        --precedence 5 || print_warning "DefaultOrg-Admins group may already exist"
    
    print_success "Cognito groups created"
}

# Add current user to Admin group
add_user_to_admin() {
    print_status "Adding current user to Admin group..."
    
    USER_POOL_ID=$(node -e "console.log(require('./src/aws-exports.js').aws_user_pools_id)")
    USER_EMAIL=${USER_EMAIL:-"wherdzik@gmail.com"}
    
    aws cognito-idp admin-add-user-to-group \
        --user-pool-id "$USER_POOL_ID" \
        --username "$USER_EMAIL" \
        --group-name "Admin" || print_warning "User may already be in Admin group"
    
    print_success "User added to Admin group"
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Enterprise setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Test the application: npm run dev"
    echo "2. Create additional organizations as needed"
    echo "3. Add users to appropriate Cognito groups"
    echo "4. Review the documentation: docs/ENTERPRISE_SOLUTION.md"
    echo ""
    echo "For additional organizations:"
    echo "- Create Cognito groups: {OrgName}-Members, {OrgName}-Admins"
    echo "- Add users to appropriate groups"
    echo "- Create organization records in the app"
    echo ""
}

# Main execution
main() {
    echo ""
    print_status "Starting enterprise setup..."
    
    # Pre-flight checks
    check_amplify
    check_auth
    
    # Deploy schema
    deploy_schema
    
    # Setup Cognito groups
    setup_cognito_groups
    
    # Add user to admin group
    add_user_to_admin
    
    # Run migration (if password is set)
    if [ -n "$USER_PASSWORD" ]; then
        run_migration
    else
        print_warning "Skipping migration - USER_PASSWORD not set"
        echo "To run migration later:"
        echo "export USER_PASSWORD='your-password'"
        echo "node scripts/migrate-to-enterprise-schema.js"
    fi
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@" 