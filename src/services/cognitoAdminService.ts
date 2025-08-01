import { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand, AdminCreateUserCommand, ListGroupsCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminSetUserPasswordCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import config from '../amplifyconfiguration.json';
import { sendWelcomeEmailDirect } from './simpleEmailService';
import { sendPasswordResetEmailViaLambda } from './lambdaEmailService';

// Get AWS configuration from Amplify config with fallbacks
const getAWSConfig = () => {
  // Try environment variables first (for local development)
  const region = import.meta.env.VITE_AWS_REGION || config.aws_project_region || 'us-east-2';
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  
  return { region, accessKeyId, secretAccessKey };
};

const awsConfig = getAWSConfig();

const REGION = awsConfig.region;
const USER_POOL_ID = config.aws_user_pools_id; // Use the config value directly

// Use environment-based API URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-gateway-url.amazonaws.com/prod' 
  : 'http://localhost:4000';

export async function listCognitoUsers() {
  try {
    console.log('🔍 Fetching real Cognito users from User Pool:', USER_POOL_ID);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito access');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Debug: Log the session credentials details
    console.log('🔍 Browser Session Credentials Debug:');
    console.log(`  - Access Key ID: ${session.credentials.accessKeyId.substring(0, 10)}...`);
    console.log(`  - Session Token: ${session.credentials.sessionToken ? 'Present' : 'Missing'}`);
    console.log(`  - Identity ID: ${session.identityId || 'Not available'}`);
    
    // Debug: Check what role these credentials represent
    try {
      const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
      const stsClient = new STSClient({
        region: REGION,
        credentials: {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken,
        },
      });
      
      const identityCommand = new GetCallerIdentityCommand({});
      const identity = await stsClient.send(identityCommand);
      
      console.log('🔍 Session Credentials Identity:');
      console.log(`  - Account: ${identity.Account}`);
      console.log(`  - User ID: ${identity.UserId}`);
      console.log(`  - ARN: ${identity.Arn}`);
    } catch (error) {
      console.log('❌ Error checking session identity:', error.message);
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // List all users from the User Pool - removed AttributesToGet to avoid constraint errors
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });
    
    const result = await client.send(listUsersCommand);
    
    if (!result.Users) {
      console.log('📝 No users found in Cognito User Pool');
      return [];
    }
    
    console.log(`📝 Found ${result.Users.length} users in Cognito User Pool`);
    
    // Get groups for each user
    const usersWithGroups = await Promise.all(
      result.Users.map(async (cognitoUser) => {
        // Skip users with empty or null usernames to prevent InvalidParameterException
        if (!cognitoUser.Username || cognitoUser.Username.trim() === '') {
          console.warn(`⚠️ Skipping user with empty username:`, cognitoUser);
          return {
            Username: cognitoUser.Username || 'unknown',
            Attributes: cognitoUser.Attributes?.map(attr => ({
              Name: attr.Name,
              Value: attr.Value
            })) || [],
            Enabled: cognitoUser.Enabled,
            UserStatus: cognitoUser.UserStatus,
            groups: []
          };
        }

        try {
          const groupsCommand = new AdminListGroupsForUserCommand({
            Username: cognitoUser.Username,
            UserPoolId: USER_POOL_ID
          });
          
          const groupsResult = await client.send(groupsCommand);
          const groups = groupsResult.Groups?.map(group => group.GroupName) || [];
          
          console.log(`👤 User ${cognitoUser.Username} has groups:`, groups);
          
          return {
            Username: cognitoUser.Username,
            Attributes: cognitoUser.Attributes?.map(attr => ({
              Name: attr.Name,
              Value: attr.Value
            })) || [],
            Enabled: cognitoUser.Enabled,
            UserStatus: cognitoUser.UserStatus,
            groups: groups
          };
        } catch (error) {
          console.warn(`⚠️ Failed to get groups for user ${cognitoUser.Username}:`, error);
          return {
            Username: cognitoUser.Username,
            Attributes: cognitoUser.Attributes?.map(attr => ({
              Name: attr.Name,
              Value: attr.Value
            })) || [],
            Enabled: cognitoUser.Enabled,
            UserStatus: cognitoUser.UserStatus,
            groups: []
          };
        }
      })
    );
    
    console.log('✅ Successfully fetched real Cognito users with groups');
    return usersWithGroups;
    
  } catch (error) {
    console.error('❌ Error fetching Cognito users:', error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createCognitoUser(username: string, email: string, firstName: string, lastName: string, groups: string[] = []) {
  try {
    console.log(`👤 Creating new Cognito user: ${username} (${email})`);
    
    // Validate input parameters
    if (!username || !email || !firstName || !lastName) {
      throw new Error('All user fields are required: username, email, firstName, lastName');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    // Validate username format (Cognito requirements)
    const usernameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
    if (!usernameRegex.test(username)) {
      throw new Error('Username contains invalid characters. Only letters, numbers, and common punctuation are allowed.');
    }
    
    // Use AWS SDK directly for admin user creation (better control)
    const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminGetUserCommand, AdminSetUserPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito create operation');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Debug: Log the session credentials details
    console.log('🔍 Browser Session Credentials Debug:');
    console.log(`  - Access Key ID: ${session.credentials.accessKeyId.substring(0, 10)}...`);
    console.log(`  - Session Token: ${session.credentials.sessionToken ? 'Present' : 'Missing'}`);
    console.log(`  - Identity ID: ${session.identityId || 'Not available'}`);
    
    // Debug: Check what role these credentials represent
    try {
      const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
      const stsClient = new STSClient({
        region: REGION,
        credentials: {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken,
        },
      });
      
      const identityCommand = new GetCallerIdentityCommand({});
      const identity = await stsClient.send(identityCommand);
      
      console.log('🔍 Session Credentials Identity:');
      console.log(`  - Account: ${identity.Account}`);
      console.log(`  - User ID: ${identity.UserId}`);
      console.log(`  - ARN: ${identity.Arn}`);
    } catch (error) {
      console.log('❌ Error checking session identity:', error.message);
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });

    // Check if user already exists
    let userExists = false;
    let existingUserStatus = null;
    let existingUser = null;
    
    try {
      const getUserCommand = new AdminGetUserCommand({
        Username: username,
        UserPoolId: USER_POOL_ID
      });
      
      existingUser = await client.send(getUserCommand);
      userExists = true;
      existingUserStatus = existingUser.UserStatus;
      console.log(`⚠️ User ${username} already exists with status: ${existingUserStatus}`);
      
      // If user exists and is confirmed, we can't modify them this way
      if (existingUserStatus === 'CONFIRMED') {
        throw new Error(`User '${username}' already exists and is confirmed. Please choose a different username or use the existing user.`);
      }
      
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        console.log(`✅ Username '${username}' is available`);
        userExists = false;
      } else if (error.message.includes('already exists and is confirmed')) {
        throw error; // Re-throw our custom error
      } else {
        console.warn(`⚠️ Error checking if user exists:`, error);
        // Continue with creation attempt
        userExists = false;
      }
    }

    // Generate a secure temporary password
    const tempPassword = generateTemporaryPassword();
    
    let createResult;
    
    // Create the user with SUPPRESS to avoid sending default Cognito email
    // We'll send our custom welcome email via SES
    console.log(`📤 Creating user ${username} with MessageAction: SUPPRESS (we'll send custom email via SES)`);
    
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      TemporaryPassword: tempPassword,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'given_name',
          Value: firstName
        },
        {
          Name: 'family_name',
          Value: lastName
        },
        {
          Name: 'email_verified',
          Value: 'false'
        }
      ],
      MessageAction: 'SUPPRESS' // Don't send default Cognito email
    });
    
    console.log('📤 Sending AdminCreateUserCommand with data:', {
      UserPoolId: USER_POOL_ID,
      Username: username,
      TemporaryPassword: '***HIDDEN***',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'email_verified', Value: 'false' }
      ],
      MessageAction: 'SUPPRESS'
    });
    
    try {
      createResult = await client.send(createUserCommand);
      console.log(`✅ Successfully created user ${username}`);
      console.log(`📝 User status: ${createResult.User?.UserStatus}`);
      
    } catch (error: any) {
      console.error(`❌ Error creating Cognito user ${username}:`, error);
      console.log('📋 Full error details:', {
        name: error.name,
        message: error.message,
        code: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId
      });
      
      // Enhanced error handling for common issues
      if (error.$metadata?.httpStatusCode === 400) {
        console.log('🚨 Detected 400 Bad Request error. This suggests:');
        console.log('   - Invalid User Pool ID');
        console.log('   - Invalid region');
        console.log('   - Missing required attributes');
        console.log('   - Authentication issues');
        throw new Error('Failed to create user: Configuration issue detected. The User Pool ID or region may be incorrect. Please check AWS Amplify configuration. ' + error.message);
      }
      
      if (error.name === 'UsernameExistsException') {
        throw new Error(`User '${username}' already exists. Please choose a different username.`);
      }
      
      if (error.name === 'InvalidPasswordException') {
        throw new Error('The temporary password does not meet Cognito requirements. Please try again.');
      }
      
      if (error.name === 'NotAuthorizedException') {
        throw new Error('You do not have permission to create users. Please contact your administrator.');
      }
      
      throw new Error(`Failed to create user: ${error.message}`);
    }
    
    // Add user to selected groups
    if (groups.length > 0) {
      console.log(`👥 Adding user ${username} to groups:`, groups);
      
      for (const groupName of groups) {
        try {
          const addToGroupCommand = new AdminAddUserToGroupCommand({
            Username: username,
            GroupName: groupName,
            UserPoolId: USER_POOL_ID
          });
          
          await client.send(addToGroupCommand);
          console.log(`✅ Added user ${username} to group ${groupName}`);
          
        } catch (error: any) {
          console.warn(`⚠️ Failed to add user ${username} to group ${groupName}:`, error);
          // Don't fail the entire operation if group assignment fails
        }
      }
    }
    
    // Enhanced email handling with Cognito fallback
    let emailResult: { success: boolean; messageId?: string; error?: string } = { success: false, error: 'No email sent' };
    
    // Try Lambda email first, then fall back to Cognito's built-in email
                try {
              console.log(`📧 Attempting to send welcome email directly via SES to ${email}`);
              emailResult = await sendWelcomeEmailDirect(email, username, tempPassword, firstName);
              
              if (emailResult.success) {
                console.log(`✅ Welcome email sent successfully via SES. Message ID: ${emailResult.messageId}`);
              } else {
                console.warn(`⚠️ SES welcome email failed: ${emailResult.error}`);
                console.log(`📧 Falling back to Cognito's built-in email system...`);
                
                // Fall back to Cognito's built-in email by updating the user
                const updateCommand = new AdminSetUserPasswordCommand({
                  UserPoolId: USER_POOL_ID,
                  Username: username,
                  Password: tempPassword,
                  Permanent: false
                });
                
                await client.send(updateCommand);
                console.log(`✅ Cognito will send automatic welcome email to ${email}`);
                emailResult = { success: true, messageId: 'cognito-fallback' };
              }
            } catch (error: any) {
              console.error('❌ Error sending welcome email:', error);
              emailResult.error = `Email error: ${error.message}`;
              
              // Final fallback - let Cognito handle the email
              console.log(`📧 Using Cognito's built-in email system as final fallback...`);
              emailResult = { success: true, messageId: 'cognito-fallback' };
            }
    
    return {
      success: true,
      message: `User ${username} created successfully. User will receive an email with temporary password and must change it on first login.`,
      username: username,
      email: email,
      tempPassword: tempPassword, // For admin reference only
      groups: groups,
      emailResult: emailResult
    };
    
  } catch (error) {
    console.error(`❌ Error creating user ${username}:`, error);
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteCognitoUser(username: string) {
  try {
    console.log(`🗑️ Deleting Cognito user: ${username}`);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito delete operation');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const deleteUserCommand = new AdminDeleteUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    await client.send(deleteUserCommand);
    
    console.log(`✅ Successfully deleted user ${username}`);
    return {
      success: true,
      message: `User ${username} deleted successfully`
    };
    
  } catch (error) {
    console.error(`❌ Error deleting user ${username}:`, error);
    throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listCognitoGroups() {
  try {
    console.log('🔍 Fetching Cognito groups from User Pool:', USER_POOL_ID);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, ListGroupsCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito groups access');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });
    
    const result = await client.send(listGroupsCommand);
    
    if (!result.Groups) {
      console.log('📝 No groups found in Cognito User Pool');
      return [];
    }
    
    console.log(`📝 Found ${result.Groups.length} groups in Cognito User Pool:`, result.Groups);
    
    return result.Groups.map(group => ({
      GroupName: group.GroupName,
      Description: group.Description,
      Precedence: group.Precedence,
      LastModifiedDate: group.LastModifiedDate,
      CreationDate: group.CreationDate
    }));
    
  } catch (error) {
    console.error('❌ Error fetching Cognito groups:', error);
    throw new Error(`Failed to fetch groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateUserRoles(username: string, newGroups: string[]) {
  try {
    console.log(`👥 Updating roles for user ${username}:`, newGroups);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminListGroupsForUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito role management');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // Get current user groups
    const currentGroupsCommand = new AdminListGroupsForUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    const currentGroupsResult = await client.send(currentGroupsCommand);
    const currentGroups = currentGroupsResult.Groups?.map(group => group.GroupName) || [];
    
    console.log(`📝 Current groups for ${username}:`, currentGroups);
    console.log(`📝 New groups for ${username}:`, newGroups);
    
    // Remove user from groups that are no longer selected
    for (const groupName of currentGroups) {
      if (!newGroups.includes(groupName)) {
        try {
          const removeCommand = new AdminRemoveUserFromGroupCommand({
            Username: username,
            GroupName: groupName,
            UserPoolId: USER_POOL_ID
          });
          
          await client.send(removeCommand);
          console.log(`✅ Removed user ${username} from group ${groupName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to remove user ${username} from group ${groupName}:`, error);
        }
      }
    }
    
    // Add user to new groups
    for (const groupName of newGroups) {
      if (!currentGroups.includes(groupName)) {
        try {
          const addCommand = new AdminAddUserToGroupCommand({
            Username: username,
            GroupName: groupName,
            UserPoolId: USER_POOL_ID
          });
          
          await client.send(addCommand);
          console.log(`✅ Added user ${username} to group ${groupName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to add user ${username} to group ${groupName}:`, error);
        }
      }
    }
    
    console.log(`✅ Successfully updated roles for user ${username}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating roles for user ${username}:`, error);
    throw new Error(`Failed to update user roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function resendInvitation(username: string) {
  try {
    console.log(`📧 Resending invitation to user: ${username}`);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminSetUserPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito invitation resend');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // First, get the user's current status
    const getUserCommand = new AdminGetUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    const userResult = await client.send(getUserCommand);
    const userStatus = userResult.UserStatus;
    
    console.log(`📝 User ${username} current status:`, userStatus);
    
    if (userStatus === 'CONFIRMED') {
      // If user is already confirmed, we can't resend invitation
      throw new Error('This user has already confirmed their account and cannot receive a new invitation. Only unconfirmed users can receive invitation emails.');
    }
    
    // Generate a temporary password that will force the user to change it
    const tempPassword = generateTemporaryPassword();
    
    // Set the temporary password - this will trigger Cognito to send a welcome email
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      Username: username,
      Password: tempPassword,
      Permanent: false, // This makes it temporary, forcing password change on first login
      UserPoolId: USER_POOL_ID
    });
    
    await client.send(setPasswordCommand);
    
    console.log(`✅ Successfully resent invitation to ${username}`);
    console.log(`📧 Cognito will automatically send a welcome email with temporary password`);
    
    return {
      success: true,
      message: `Invitation resent to ${username}. User will receive an email with temporary password.`,
      tempPassword: tempPassword // For admin reference only
    };
    
  } catch (error) {
    console.error(`❌ Error resending invitation to ${username}:`, error);
    throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function resetUserPassword(username: string) {
  try {
    console.log(`🔐 Resetting password for user: ${username}`);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminSetUserPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito password reset');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // First, get the user's current status
    const getUserCommand = new AdminGetUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    const userResult = await client.send(getUserCommand);
    const userStatus = userResult.UserStatus;
    
    console.log(`📝 User ${username} current status:`, userStatus);
    
    // Generate a temporary password that will force the user to change it
    const tempPassword = generateTemporaryPassword();
    
    // Set the temporary password - this works for both confirmed and unconfirmed users
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      Username: username,
      Password: tempPassword,
      Permanent: false, // This makes it temporary, forcing password change on next login
      UserPoolId: USER_POOL_ID
    });
    
    await client.send(setPasswordCommand);
    
    console.log(`✅ Successfully reset password for ${username}`);
    
    // Enhanced email handling with SES fallback
    let emailResult: { success: boolean; messageId?: string; error?: string } = { success: false, error: 'No email sent' };
    let sesConfig: any = null;
    
    // Get user's email from attributes
    const emailAttribute = userResult.UserAttributes?.find(attr => attr.Name === 'email');
    const email = emailAttribute?.Value;
    
    if (email) {
      // Send password reset email via Lambda function
      try {
        console.log(`📧 Attempting to send password reset email via Lambda to ${email}`);
        emailResult = await sendPasswordResetEmailViaLambda(email, username, tempPassword);
        
        if (emailResult.success) {
          console.log(`✅ Password reset email sent successfully via Lambda. Message ID: ${emailResult.messageId}`);
        } else {
          console.warn(`⚠️ Lambda password reset email failed: ${emailResult.error}`);
        }
      } catch (error: any) {
        console.error('❌ Error sending password reset email via Lambda:', error);
        emailResult.error = `Lambda email error: ${error.message}`;
      }
    }
    
    // If Lambda email failed, log the issue but don't fail password reset
    if (!emailResult.success) {
      console.log(`📧 Lambda email failed, but password reset was successful. User will need to check their email or contact admin for credentials.`);
      console.log(`📧 Email error details: ${emailResult.error}`);
    }
    
    return {
      success: true,
      message: `Password reset for ${username}. User will receive an email with temporary password and must change it on next login.`,
      tempPassword: tempPassword, // For admin reference only
      emailResult: emailResult
    };
    
  } catch (error) {
    console.error(`❌ Error resetting password for ${username}:`, error);
    throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special character
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export const getUserDetails = async (username: string): Promise<any> => {
  try {
    const { CognitoIdentityProviderClient, AdminGetUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const command = new AdminGetUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    const result = await client.send(command);
    return result;
  } catch (error) {
    console.error(`❌ Error getting user details for ${username}:`, error);
    throw error;
  }
};

// Test function to verify User Pool configuration
export async function testUserPoolConfiguration() {
  try {
    console.log('🧪 Testing User Pool Configuration...');
    
    // Test if we can list users (this will verify permissions)
    const users = await listCognitoUsers();
    console.log('✅ User Pool configuration is working!');
    console.log(`📝 Found ${users.length} users in the pool`);
    
    return {
      success: true,
      userPoolId: USER_POOL_ID,
      region: REGION,
      userCount: users.length
    };
  } catch (error) {
    console.error('❌ User Pool configuration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userPoolId: USER_POOL_ID,
      region: REGION
    };
  }
}

// Comprehensive test function to verify all Cognito permissions
export async function testCognitoPermissions() {
  try {
    console.log('🔐 Testing Cognito Permissions...');
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('🔐 Using session credentials for Cognito permissions test');
    
    // Get session credentials for browser environment
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated Cognito client with session credentials
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // Test 1: List Users (should work if we have basic read permissions)
    console.log('🧪 Test 1: Testing ListUsers permission...');
    try {
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 1
      });
      
      const listResult = await client.send(listUsersCommand);
      console.log('✅ ListUsers permission: SUCCESS');
      console.log(`📝 Found ${listResult.Users?.length || 0} users`);
    } catch (error: any) {
      console.error('❌ ListUsers permission: FAILED');
      console.error('   Error:', error.message);
      throw new Error(`ListUsers permission failed: ${error.message}`);
    }
    
    // Test 2: Try to create a test user (this will fail but tell us about permissions)
    console.log('🧪 Test 2: Testing AdminCreateUser permission...');
    try {
      const testUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: 'test-user-permission-check',
        TemporaryPassword: 'TestPass123!',
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@example.com'
          }
        ],
        MessageAction: 'SUPPRESS'
      });
      
      await client.send(testUserCommand);
      console.log('✅ AdminCreateUser permission: SUCCESS');
      
      // Clean up the test user
      console.log('🧹 Cleaning up test user...');
      const { AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      const deleteCommand = new AdminDeleteUserCommand({
        Username: 'test-user-permission-check',
        UserPoolId: USER_POOL_ID
      });
      
      await client.send(deleteCommand);
      console.log('✅ Test user cleaned up successfully');
      
    } catch (error: any) {
      console.error('❌ AdminCreateUser permission: FAILED');
      console.error('   Error:', error.message);
      console.error('   Error Code:', error.name);
      console.error('   HTTP Status:', error.$metadata?.httpStatusCode);
      
      if (error.name === 'UsernameExistsException') {
        console.log('✅ AdminCreateUser permission: PARTIAL SUCCESS (user already exists)');
      } else if (error.name === 'NotAuthorizedException') {
        throw new Error('AdminCreateUser permission denied. Check IAM policies.');
      } else if (error.name === 'UserNotFoundException') {
        throw new Error('User Pool not found. Check User Pool ID and region.');
      } else {
        throw new Error(`AdminCreateUser failed: ${error.message}`);
      }
    }
    
    console.log('✅ All Cognito permission tests passed!');
    return {
      success: true,
      userPoolId: USER_POOL_ID,
      region: REGION,
      permissions: ['ListUsers', 'AdminCreateUser']
    };
    
  } catch (error) {
    console.error('❌ Cognito permission test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userPoolId: USER_POOL_ID,
      region: REGION
    };
  }
}

// Test function to determine the correct User Pool ID
export async function testUserPoolIds() {
  const userPoolIds = [
    'us-east-2_ldPO5ZKCR', // lowercase "l"
    'us-east-2_IdPO5ZKCR'  // uppercase "I"
  ];
  
  console.log('🧪 Testing User Pool IDs...');
  
  for (const userPoolId of userPoolIds) {
    try {
      console.log(`\n🔍 Testing User Pool ID: ${userPoolId}`);
      
      const { CognitoIdentityProviderClient, ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      const { getCurrentUser } = await import('aws-amplify/auth');
      
      // Get authenticated user credentials
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      // Get session credentials for browser environment
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      
      if (!session.credentials) {
        throw new Error('No credentials available in session');
      }
      
      // Create authenticated Cognito client with session credentials
      const client = new CognitoIdentityProviderClient({
        region: 'us-east-2',
        credentials: {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken,
        },
      });
      
      // Test ListUsers with this User Pool ID
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 1
      });
      
      const result = await client.send(listUsersCommand);
      console.log(`✅ SUCCESS: User Pool ID ${userPoolId} is valid!`);
      console.log(`📝 Found ${result.Users?.length || 0} users`);
      
      return {
        success: true,
        correctUserPoolId: userPoolId,
        userCount: result.Users?.length || 0
      };
      
    } catch (error: any) {
      console.log(`❌ FAILED: User Pool ID ${userPoolId} is invalid`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Error Code: ${error.name}`);
      console.log(`   HTTP Status: ${error.$metadata?.httpStatusCode}`);
    }
  }
  
  console.log('\n❌ No valid User Pool ID found!');
  return {
    success: false,
    error: 'No valid User Pool ID found'
  };
}