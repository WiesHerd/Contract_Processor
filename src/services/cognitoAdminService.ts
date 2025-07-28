import { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand, AdminCreateUserCommand, ListGroupsCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminSetUserPasswordCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import config from '../amplifyconfiguration.json';

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
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito access');
    
    // Create authenticated Cognito client
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
    console.log('🔍 Debug Info:');
    console.log('  - USER_POOL_ID:', USER_POOL_ID);
    console.log('  - REGION:', REGION);
    console.log('  - Config aws_user_pools_id:', config.aws_user_pools_id);
    console.log('  - Config aws_project_region:', config.aws_project_region);
    
    // Validate input parameters
    if (!username || username.trim() === '') {
      throw new Error('Username cannot be empty');
    }
    
    if (!email || email.trim() === '') {
      throw new Error('Email cannot be empty');
    }
    
    if (!firstName || firstName.trim() === '') {
      throw new Error('First name cannot be empty');
    }
    
    if (!lastName || lastName.trim() === '') {
      throw new Error('Last name cannot be empty');
    }
    
    // Validate username format (Cognito requirements)
    const usernameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
    if (!usernameRegex.test(username)) {
      throw new Error('Username contains invalid characters. Only letters, numbers, and common punctuation are allowed.');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito create operation');
    
    // Use AWS SDK directly for admin user creation (better control)
    const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminGetUserCommand, AdminSetUserPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('📋 Session credentials:', {
      accessKeyId: session.credentials.accessKeyId ? 'present' : 'missing',
      secretAccessKey: session.credentials.secretAccessKey ? 'present' : 'missing',
      sessionToken: session.credentials.sessionToken ? 'present' : 'missing'
    });
    
    // Create authenticated Cognito client
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
    
    // Always try to create the user with RESEND to send welcome email
    // If user exists, we'll catch the exception and handle it
    console.log(`📤 Creating/updating user ${username} with MessageAction: RESEND (to ensure welcome email)`);
    
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
      MessageAction: 'RESEND' // Always try to send welcome email
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
      MessageAction: 'RESEND'
    });
    
    try {
      createResult = await client.send(createUserCommand);
      console.log(`✅ Successfully created new user ${username} in Cognito`);
      console.log(`📧 Welcome email sent automatically to ${email} with temporary password`);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        console.log(`⚠️ User ${username} already exists, updating password and sending welcome email`);
        
        // User exists - update their password and trigger welcome email
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          Username: username,
          Password: tempPassword,
          Permanent: false, // This makes it temporary, forcing password change on first login
          UserPoolId: USER_POOL_ID
        });
        
        await client.send(setPasswordCommand);
        console.log(`✅ Successfully updated password for existing user ${username}`);
        
        // Use existing user data
        createResult = { User: existingUser.User };
        console.log(`📧 Welcome email will be sent to ${email} with temporary password`);
        
      } else if (error.message.includes('Resend not possible')) {
        // Handle the case where user exists but can't receive resend
        console.log(`⚠️ User ${username} exists but can't receive resend, updating password only`);
        
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          Username: username,
          Password: tempPassword,
          Permanent: false,
          UserPoolId: USER_POOL_ID
        });
        
        await client.send(setPasswordCommand);
        console.log(`✅ Successfully updated password for existing user ${username}`);
        
        // Use existing user data
        createResult = { User: existingUser.User };
        console.log(`📧 Manual welcome email needed for ${email} with temporary password`);
        
      } else {
        throw error;
      }
    }
    
    console.log('📋 Create/Update result:', createResult);
    
    // Add user to groups if specified
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
        } catch (error) {
          console.warn(`⚠️ Failed to add user ${username} to group ${groupName}:`, error);
        }
      }
    }
    
    // Now send a proper welcome email with login instructions
    console.log(`📧 User ${username} ${userExists ? 'updated' : 'created'} successfully!`);
    console.log(`📧 Temporary password: ${tempPassword}`);
    
    if (userExists) {
      console.log(`📧 Email suppressed (user already existed). Admin should manually send credentials.`);
    } else {
      console.log(`📧 Welcome email sent automatically to ${email} with login instructions`);
    }
    
    console.log(`📧 User should sign in with username: ${username} and temporary password`);
    console.log(`📧 User will be forced to change password on first login`);
    
    return {
      ...createResult.User,
      tempPassword: tempPassword,
      loginInstructions: `User can sign in with username: ${username} and temporary password: ${tempPassword}`,
      emailSent: !userExists,
      userExisted: userExists
    };
    
  } catch (error: any) {
    console.error(`❌ Error creating Cognito user ${username}:`, error);
    console.error('📋 Full error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      $metadata: error.$metadata
    });
    
    // Check if this is a 400 error
    if (error.$metadata?.httpStatusCode === 400) {
      console.error('🚨 Detected 400 Bad Request error. This suggests:');
      console.error('   - Invalid User Pool ID');
      console.error('   - Invalid region');
      console.error('   - Missing required attributes');
      console.error('   - Authentication issues');
      
      // Provide more specific guidance based on error message
      if (error.message.includes('User does not exist')) {
        throw new Error(`Failed to create user: Configuration issue detected. The User Pool ID or region may be incorrect. Please check AWS Amplify configuration. Error: ${error.message}`);
      } else if (error.message.includes('Resend not possible')) {
        throw new Error(`Failed to create user: User '${username}' already exists but is not in the correct state for email resend. Please choose a different username. Error: ${error.message}`);
      } else {
        throw new Error(`Failed to create user: Bad request (400). Please check User Pool configuration and permissions. Error: ${error.message}`);
      }
    }
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('UsernameExistsException')) {
        throw new Error(`Failed to create user: Username '${username}' already exists. Please choose a different username.`);
      } else if (error.message.includes('InvalidParameterException')) {
        throw new Error(`Failed to create user: Invalid parameters. Please check username format and email address.`);
      } else if (error.message.includes('InvalidPasswordException')) {
        throw new Error(`Failed to create user: Password does not meet requirements.`);
      } else if (error.message.includes('LimitExceededException')) {
        throw new Error(`Failed to create user: User pool limit exceeded. Please contact administrator.`);
      } else if (error.message.includes('NotAuthorizedException')) {
        throw new Error(`Failed to create user: Not authorized to perform this action.`);
      } else if (error.message.includes('UserNotFoundException')) {
        throw new Error(`Failed to create user: Configuration issue detected. Please check AWS Amplify setup.`);
      } else if (error.message.includes('UnsupportedUserStateException')) {
        throw new Error(`Failed to create user: User '${username}' exists but is in an unsupported state. Please choose a different username.`);
      } else {
        throw new Error(`Failed to create user: ${error.message}`);
      }
    } else {
      throw new Error(`Failed to create user: ${String(error)}`);
    }
  }
}

export async function deleteCognitoUser(username: string) {
  try {
    console.log(`🗑️ Deleting user from Cognito: ${username}`);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito delete operation');
    
    // Create authenticated Cognito client
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // Delete the user from Cognito
    const deleteUserCommand = new AdminDeleteUserCommand({
      Username: username,
      UserPoolId: USER_POOL_ID
    });
    
    await client.send(deleteUserCommand);
    
    console.log(`✅ Successfully deleted user ${username} from Cognito`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error deleting Cognito user ${username}:`, error);
    throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listCognitoGroups() {
  try {
    console.log('🔍 Fetching Cognito groups from User Pool:', USER_POOL_ID);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, ListGroupsCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito groups access');
    
    // Create authenticated Cognito client
    const client = new CognitoIdentityProviderClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // List all groups from the User Pool
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });
    
    const result = await client.send(listGroupsCommand);
    
    if (!result.Groups) {
      console.log('📝 No groups found in Cognito User Pool');
      return [];
    }
    
    console.log(`📝 Found ${result.Groups.length} groups in Cognito User Pool:`, result.Groups.map(g => g.GroupName));
    
    // Transform the groups to match our interface
    const groups = result.Groups.map(group => ({
      GroupName: group.GroupName || '',
      Description: group.Description || '',
      Precedence: group.Precedence || 0
    }));
    
    return groups;
    
  } catch (error) {
    console.error(`❌ Error fetching Cognito groups:`, error);
    throw new Error(`Failed to fetch groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateUserRoles(username: string, newGroups: string[]) {
  try {
    console.log(`👥 Updating roles for user ${username}:`, newGroups);
    
    // Use AWS SDK directly with authenticated user credentials
    const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminListGroupsForUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito role management');
    
    // Create authenticated Cognito client
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
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito invitation resend');
    
    // Create authenticated Cognito client
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
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('🔐 Using authenticated credentials for Cognito password reset');
    
    // Create authenticated Cognito client
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
    console.log(`📧 Cognito will automatically send a password reset email`);
    
    return {
      success: true,
      message: `Password reset for ${username}. User will receive an email with temporary password and must change it on next login.`,
      tempPassword: tempPassword // For admin reference only
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
  
  // Ensure at least one of each required character type
  password += 'A'; // uppercase
  password += 'a'; // lowercase  
  password += '1'; // number
  password += '!'; // special char
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Test function to verify User Pool configuration
export async function testUserPoolConfiguration() {
  try {
    console.log('🧪 Testing User Pool Configuration...');
    console.log('📋 Configuration:');
    console.log('  - USER_POOL_ID:', USER_POOL_ID);
    console.log('  - REGION:', REGION);
    console.log('  - Config aws_user_pools_id:', config.aws_user_pools_id);
    console.log('  - Config aws_project_region:', config.aws_project_region);
    
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
    const { fetchAuthSession } = await import('aws-amplify/auth');
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    console.log('📋 Session credentials:', {
      accessKeyId: session.credentials.accessKeyId ? 'present' : 'missing',
      secretAccessKey: session.credentials.secretAccessKey ? 'present' : 'missing',
      sessionToken: session.credentials.sessionToken ? 'present' : 'missing'
    });
    
    // Create authenticated Cognito client
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
      console.log('✅ Test user cleaned up');
      
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