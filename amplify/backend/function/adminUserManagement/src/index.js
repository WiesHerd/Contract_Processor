const AWS = require('aws-sdk');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { httpMethod, path, body, queryStringParameters } = event;
  const pathSegments = path.split('/').filter(segment => segment);
  
  try {
    // Get user pool ID from environment or use default
    const userPoolId = process.env.USER_POOL_ID || 'us-east-2_xxxxxxxxx'; // Replace with your actual user pool ID
    
    switch (httpMethod) {
      case 'GET':
        if (pathSegments.includes('users')) {
          return await handleGetUsers(userPoolId, queryStringParameters);
        } else if (pathSegments.includes('groups')) {
          return await handleGetGroups(userPoolId);
        }
        break;
        
      case 'POST':
        if (pathSegments.includes('users')) {
          const userData = JSON.parse(body);
          return await handleCreateUser(userPoolId, userData);
        } else if (pathSegments.includes('users') && pathSegments.includes('bulk')) {
          const bulkData = JSON.parse(body);
          return await handleBulkUserOperation(userPoolId, bulkData);
        } else if (pathSegments.includes('groups')) {
          const groupData = JSON.parse(body);
          return await handleCreateGroup(userPoolId, groupData);
        } else if (pathSegments.includes('email')) {
          const emailData = JSON.parse(body);
          return await handleSendEmail(emailData);
        }
        break;
        
      case 'PUT':
        if (pathSegments.includes('users') && pathSegments.length > 2) {
          const userId = pathSegments[pathSegments.indexOf('users') + 1];
          const userData = JSON.parse(body);
          return await handleUpdateUser(userPoolId, userId, userData);
        } else if (pathSegments.includes('groups') && pathSegments.length > 2) {
          const groupName = pathSegments[pathSegments.indexOf('groups') + 1];
          const groupData = JSON.parse(body);
          return await handleUpdateGroup(userPoolId, groupName, groupData);
        }
        break;
        
      case 'DELETE':
        if (pathSegments.includes('users') && pathSegments.length > 2) {
          const userId = pathSegments[pathSegments.indexOf('users') + 1];
          return await handleDeleteUser(userPoolId, userId);
        } else if (pathSegments.includes('groups') && pathSegments.length > 2) {
          const groupName = pathSegments[pathSegments.indexOf('groups') + 1];
          return await handleDeleteGroup(userPoolId, groupName);
        }
        break;
        
      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
    
    return createResponse(404, { error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Get all users
async function handleGetUsers(userPoolId, queryParams = {}) {
  const params = {
    UserPoolId: userPoolId,
    AttributesToGet: ['email', 'given_name', 'family_name', 'phone_number', 'email_verified', 'phone_number_verified'],
    Limit: queryParams.limit ? parseInt(queryParams.limit) : 60
  };
  
  if (queryParams.paginationToken) {
    params.PaginationToken = queryParams.paginationToken;
  }
  
  if (queryParams.filter) {
    params.Filter = queryParams.filter;
  }
  
  const result = await cognitoIdentityServiceProvider.listUsers(params).promise();
  
  // Get group memberships for each user
  const usersWithGroups = await Promise.all(
    result.Users.map(async (user) => {
      const groups = await getUserGroups(userPoolId, user.Username);
      return {
        id: user.Username,
        username: user.Username,
        email: getAttributeValue(user.Attributes, 'email'),
        firstName: getAttributeValue(user.Attributes, 'given_name'),
        lastName: getAttributeValue(user.Attributes, 'family_name'),
        phoneNumber: getAttributeValue(user.Attributes, 'phone_number'),
        status: user.UserStatus,
        enabled: user.Enabled,
        groups: groups.map(g => g.GroupName),
        attributes: {
          email: getAttributeValue(user.Attributes, 'email'),
          email_verified: getAttributeValue(user.Attributes, 'email_verified') === 'true',
          given_name: getAttributeValue(user.Attributes, 'given_name'),
          family_name: getAttributeValue(user.Attributes, 'family_name'),
          phone_number: getAttributeValue(user.Attributes, 'phone_number'),
          phone_number_verified: getAttributeValue(user.Attributes, 'phone_number_verified') === 'true',
          sub: getAttributeValue(user.Attributes, 'sub')
        },
        createdAt: user.UserCreateDate,
        lastModifiedAt: user.UserLastModifiedDate,
        lastSignIn: user.UserLastModifiedDate, // Cognito doesn't provide last sign in in listUsers
        mfaEnabled: false, // Would need additional API call to get MFA status
        userStatus: user.UserStatus
      };
    })
  );
  
  return createResponse(200, {
    users: usersWithGroups,
    paginationToken: result.PaginationToken,
    count: usersWithGroups.length
  });
}

// Create a new user
async function handleCreateUser(userPoolId, userData) {
  const { username, email, firstName, lastName, phoneNumber, password, groups, sendInvitation } = userData;
  
  // Create user attributes
  const userAttributes = [
    { Name: 'email', Value: email },
    { Name: 'email_verified', Value: 'true' }
  ];
  
  if (firstName) userAttributes.push({ Name: 'given_name', Value: firstName });
  if (lastName) userAttributes.push({ Name: 'family_name', Value: lastName });
  if (phoneNumber) userAttributes.push({ Name: 'phone_number', Value: phoneNumber });
  
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    UserAttributes: userAttributes,
    MessageAction: sendInvitation ? 'SUPPRESS' : 'RESEND'
  };
  
  if (password) {
    params.TemporaryPassword = password;
  }
  
  const result = await cognitoIdentityServiceProvider.adminCreateUser(params).promise();
  
  // Add user to groups if specified
  if (groups && groups.length > 0) {
    await Promise.all(
      groups.map(groupName =>
        cognitoIdentityServiceProvider.adminAddUserToGroup({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: groupName
        }).promise()
      )
    );
  }
  
  return createResponse(201, {
    message: 'User created successfully',
    user: {
      id: result.User.Username,
      username: result.User.Username,
      email: email,
      firstName: firstName,
      lastName: lastName,
      status: result.User.UserStatus,
      enabled: result.User.Enabled
    }
  });
}

// Update a user
async function handleUpdateUser(userPoolId, userId, userData) {
  const { firstName, lastName, phoneNumber, enabled, groups } = userData;
  
  // Update user attributes
  const userAttributes = [];
  if (firstName !== undefined) userAttributes.push({ Name: 'given_name', Value: firstName });
  if (lastName !== undefined) userAttributes.push({ Name: 'family_name', Value: lastName });
  if (phoneNumber !== undefined) userAttributes.push({ Name: 'phone_number', Value: phoneNumber });
  
  if (userAttributes.length > 0) {
    await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
      UserPoolId: userPoolId,
      Username: userId,
      UserAttributes: userAttributes
    }).promise();
  }
  
  // Update enabled status
  if (enabled !== undefined) {
    if (enabled) {
      await cognitoIdentityServiceProvider.adminEnableUser({
        UserPoolId: userPoolId,
        Username: userId
      }).promise();
    } else {
      await cognitoIdentityServiceProvider.adminDisableUser({
        UserPoolId: userPoolId,
        Username: userId
      }).promise();
    }
  }
  
  // Update groups if specified
  if (groups !== undefined) {
    // Get current groups
    const currentGroups = await getUserGroups(userPoolId, userId);
    const currentGroupNames = currentGroups.map(g => g.GroupName);
    
    // Remove from groups not in new list
    const groupsToRemove = currentGroupNames.filter(group => !groups.includes(group));
    await Promise.all(
      groupsToRemove.map(groupName =>
        cognitoIdentityServiceProvider.adminRemoveUserFromGroup({
          UserPoolId: userPoolId,
          Username: userId,
          GroupName: groupName
        }).promise()
      )
    );
    
    // Add to new groups
    const groupsToAdd = groups.filter(group => !currentGroupNames.includes(group));
    await Promise.all(
      groupsToAdd.map(groupName =>
        cognitoIdentityServiceProvider.adminAddUserToGroup({
          UserPoolId: userPoolId,
          Username: userId,
          GroupName: groupName
        }).promise()
      )
    );
  }
  
  return createResponse(200, {
    message: 'User updated successfully',
    userId: userId
  });
}

// Delete a user
async function handleDeleteUser(userPoolId, userId) {
  await cognitoIdentityServiceProvider.adminDeleteUser({
    UserPoolId: userPoolId,
    Username: userId
  }).promise();
  
  return createResponse(200, {
    message: 'User deleted successfully',
    userId: userId
  });
}

// Bulk user operations
async function handleBulkUserOperation(userPoolId, bulkData) {
  const { userIds, operation, groupName } = bulkData;
  const results = [];
  
  for (const userId of userIds) {
    try {
      switch (operation) {
        case 'enable':
          await cognitoIdentityServiceProvider.adminEnableUser({
            UserPoolId: userPoolId,
            Username: userId
          }).promise();
          break;
          
        case 'disable':
          await cognitoIdentityServiceProvider.adminDisableUser({
            UserPoolId: userPoolId,
            Username: userId
          }).promise();
          break;
          
        case 'delete':
          await cognitoIdentityServiceProvider.adminDeleteUser({
            UserPoolId: userPoolId,
            Username: userId
          }).promise();
          break;
          
        case 'addToGroup':
          await cognitoIdentityServiceProvider.adminAddUserToGroup({
            UserPoolId: userPoolId,
            Username: userId,
            GroupName: groupName
          }).promise();
          break;
          
        case 'removeFromGroup':
          await cognitoIdentityServiceProvider.adminRemoveUserFromGroup({
            UserPoolId: userPoolId,
            Username: userId,
            GroupName: groupName
          }).promise();
          break;
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      results.push({ userId, success: true });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }
  
  return createResponse(200, {
    message: `Bulk ${operation} completed`,
    results: results,
    totalProcessed: userIds.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  });
}

// Get all groups
async function handleGetGroups(userPoolId) {
  const result = await cognitoIdentityServiceProvider.listGroups({
    UserPoolId: userPoolId
  }).promise();
  
  // Get user count for each group
  const groupsWithUserCount = await Promise.all(
    result.Groups.map(async (group) => {
      const usersInGroup = await cognitoIdentityServiceProvider.listUsersInGroup({
        UserPoolId: userPoolId,
        GroupName: group.GroupName
      }).promise();
      
      return {
        id: group.GroupName,
        name: group.GroupName,
        description: group.Description,
        precedence: group.Precedence,
        roleArn: group.RoleArn,
        createdAt: group.CreationDate,
        lastModifiedAt: group.LastModifiedDate,
        userCount: usersInGroup.Users.length,
        permissions: [] // Cognito doesn't store permissions, this would need to be managed separately
      };
    })
  );
  
  return createResponse(200, {
    groups: groupsWithUserCount,
    count: groupsWithUserCount.length
  });
}

// Create a new group
async function handleCreateGroup(userPoolId, groupData) {
  const { name, description, precedence, permissions } = groupData;
  
  const params = {
    UserPoolId: userPoolId,
    GroupName: name
  };
  
  if (description) params.Description = description;
  if (precedence) params.Precedence = precedence;
  
  const result = await cognitoIdentityServiceProvider.createGroup(params).promise();
  
  return createResponse(201, {
    message: 'Group created successfully',
    group: {
      id: result.Group.GroupName,
      name: result.Group.GroupName,
      description: result.Group.Description,
      precedence: result.Group.Precedence,
      roleArn: result.Group.RoleArn,
      createdAt: result.Group.CreationDate,
      lastModifiedAt: result.Group.LastModifiedDate,
      userCount: 0,
      permissions: permissions || []
    }
  });
}

// Update a group
async function handleUpdateGroup(userPoolId, groupName, groupData) {
  const { name, description, precedence, permissions } = groupData;
  
  const params = {
    UserPoolId: userPoolId,
    GroupName: groupName
  };
  
  if (name) params.NewGroupName = name;
  if (description !== undefined) params.Description = description;
  if (precedence !== undefined) params.Precedence = precedence;
  
  await cognitoIdentityServiceProvider.updateGroup(params).promise();
  
  return createResponse(200, {
    message: 'Group updated successfully',
    groupName: groupName
  });
}

// Delete a group
async function handleDeleteGroup(userPoolId, groupName) {
  await cognitoIdentityServiceProvider.deleteGroup({
    UserPoolId: userPoolId,
    GroupName: groupName
  }).promise();
  
  return createResponse(200, {
    message: 'Group deleted successfully',
    groupName: groupName
  });
}

// Helper function to get user groups
async function getUserGroups(userPoolId, username) {
  try {
    const result = await cognitoIdentityServiceProvider.adminListGroupsForUser({
      UserPoolId: userPoolId,
      Username: username
    }).promise();
    
    return result.Groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

// Helper function to get attribute value
function getAttributeValue(attributes, name) {
  const attr = attributes.find(a => a.Name === name);
  return attr ? attr.Value : null;
}

// Helper function to create HTTP response
function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// Handle email sending via SES
async function handleSendEmail(emailData) {
  try {
    const { toEmail, subject, htmlBody, textBody, emailType } = emailData;
    
    // Initialize SES
    const ses = new AWS.SES({ region: 'us-east-2' });
    
    // Email configuration
    const fromEmail = 'wherdzik@gmail.com';
    const appName = 'Contract Engine';
    const appUrl = 'https://your-app-domain.com'; // Update with your actual domain
    
    let finalSubject = subject;
    let finalHtmlBody = htmlBody;
    let finalTextBody = textBody;
    
    // If it's a welcome email, use our template
    if (emailType === 'welcome') {
      const { username, tempPassword, firstName } = emailData;
      
      finalSubject = `Welcome to ${appName} - Your Account is Ready`;
      finalHtmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Welcome to ${appName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .credentials { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${appName}</h1>
            </div>
            
            <h2>Hello ${firstName || username.split('.')[0] || 'there'},</h2>
            <p>Welcome to ${appName}! Your account has been successfully created.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Login URL:</strong> ${appUrl}</p>
            </div>
            
            <div class="warning">
              <p><strong>Important:</strong> You must change your password on your first login for security.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${appUrl}" class="button">Sign In Now</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              This is an automated message from ${appName}. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;
      
      finalTextBody = `
        Welcome to ${appName}!
        
        Hello ${firstName || username.split('.')[0] || 'there'},
        
        Welcome to ${appName}! Your account has been successfully created.
        
        YOUR LOGIN CREDENTIALS:
        Username: ${username}
        Temporary Password: ${tempPassword}
        Login URL: ${appUrl}
        
        IMPORTANT: You must change your password on your first login for security.
        
        This is an automated message from ${appName}. Please do not reply to this email.
      `;
    }
    
    // Send email via SES
    const params = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: finalSubject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: finalHtmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: finalTextBody,
            Charset: 'UTF-8'
          }
        }
      }
    };
    
    const result = await ses.sendEmail(params).promise();
    
    console.log('Email sent successfully:', result.MessageId);
    
    return createResponse(200, {
      success: true,
      messageId: result.MessageId,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    return createResponse(500, {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    });
  }
} 