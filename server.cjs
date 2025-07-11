require('dotenv').config();
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '[set]' : '[NOT SET]');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '[set]' : '[NOT SET]');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { CognitoIdentityProviderClient, ListUsersCommand, ListGroupsCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminCreateUserCommand, AdminDeleteUserCommand, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const REGION = 'us-east-2';
const USER_POOL_ID = 'us-east-2_ldPO5ZKCR';

const client = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function logAction({ user, action, severity = 'INFO', category = 'SYSTEM', details = '', resource = '' }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: user || 'system',
    action,
    severity,
    category,
    details,
    resource,
  };
  console.log('[AUDIT]', JSON.stringify(logEntry));
}

app.get('/api/users', async (req, res) => {
  try {
    const command = new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 50 });
    const response = await client.send(command);
    logAction({ action: 'LIST_USERS', severity: 'INFO', category: 'USER_MANAGEMENT', details: 'Listed users', resource: 'ALL_USERS' });
    res.json(response.Users || []);
  } catch (err) {
    logAction({ action: 'LIST_USERS', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: 'ALL_USERS' });
    res.status(500).json({ error: err.message });
  }
});

// Get user groups
app.get('/api/users/:username/groups', async (req, res) => {
  const { username } = req.params;
  try {
    const command = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });
    const response = await client.send(command);
    logAction({ action: 'LIST_USER_GROUPS', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Listed groups for user ${username}`, resource: username });
    res.json({ groups: response.Groups?.map(group => group.GroupName) || [] });
  } catch (err) {
    logAction({ action: 'LIST_USER_GROUPS', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: username });
    res.status(500).json({ error: err.message });
  }
});

// List Cognito groups (roles)
app.get('/api/roles', async (req, res) => {
  try {
    const command = new ListGroupsCommand({ UserPoolId: USER_POOL_ID });
    const response = await client.send(command);
    logAction({ action: 'LIST_ROLES', severity: 'INFO', category: 'USER_MANAGEMENT', details: 'Listed roles', resource: 'ALL_ROLES' });
    res.json(response.Groups || []);
  } catch (err) {
    logAction({ action: 'LIST_ROLES', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: 'ALL_ROLES' });
    res.status(500).json({ error: err.message });
  }
});

// Add user to group
app.post('/api/roles/:groupName/add', async (req, res) => {
  const { groupName } = req.params;
  const { username } = req.body;
  try {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    });
    await client.send(command);
    logAction({ action: 'ADD_USER_TO_GROUP', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Added user ${username} to group ${groupName}`, resource: `${username}|${groupName}` });
    res.json({ success: true });
  } catch (err) {
    logAction({ action: 'ADD_USER_TO_GROUP', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: `${username}|${groupName}` });
    res.status(500).json({ error: err.message });
  }
});

// Remove user from group
app.post('/api/roles/:groupName/remove', async (req, res) => {
  const { groupName } = req.params;
  const { username } = req.body;
  try {
    const command = new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    });
    await client.send(command);
    logAction({ action: 'REMOVE_USER_FROM_GROUP', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Removed user ${username} from group ${groupName}`, resource: `${username}|${groupName}` });
    res.json({ success: true });
  } catch (err) {
    logAction({ action: 'REMOVE_USER_FROM_GROUP', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: `${username}|${groupName}` });
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  const { username, email, temporaryPassword, groups } = req.body;
  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: temporaryPassword,
      // MessageAction: 'SUPPRESS', // Removed to enable Cognito welcome email
    });
    const response = await client.send(command);

    // Assign user to groups if provided
    if (groups && Array.isArray(groups)) {
      for (const groupName of groups) {
        const addGroupCmd = new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: groupName,
        });
        await client.send(addGroupCmd);
      }
    }
    logAction({ action: 'CREATE_USER', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Created user ${username}`, resource: username });
    res.json(response.User);
  } catch (err) {
    logAction({ action: 'CREATE_USER', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: username });
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });
    await client.send(command);
    logAction({ action: 'DELETE_USER', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Deleted user ${username}`, resource: username });
    res.json({ success: true });
  } catch (err) {
    logAction({ action: 'DELETE_USER', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: username });
    res.status(500).json({ error: err.message });
  }
});

// Update user attributes (placeholder)
app.put('/api/users/:username', async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

// Resend welcome email
app.post('/api/users/:username/resend-invite', async (req, res) => {
  const { username } = req.params;
  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      MessageAction: 'RESEND',
    });
    await client.send(command);
    logAction({ action: 'RESEND_INVITE', severity: 'INFO', category: 'USER_MANAGEMENT', details: `Resent invite to user ${username}`, resource: username });
    res.json({ success: true, message: 'Invitation email resent.' });
  } catch (err) {
    logAction({ action: 'RESEND_INVITE', severity: 'ERROR', category: 'USER_MANAGEMENT', details: err.message, resource: username });
    res.status(500).json({ error: err.message });
  }
});

const port = 4000;
app.listen(port, () => console.log(`Server running on port ${port}`)); 