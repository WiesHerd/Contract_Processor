import { IAMClient, AttachRolePolicyCommand, DetachRolePolicyCommand, ListAttachedRolePoliciesCommand } from '@aws-sdk/client-iam';

const REGION = 'us-east-2';
const ROLE_NAME = 'amplify-contractgenerator-production-78963-authRole';
const POLICY_ARN = 'arn:aws:iam::430118851518:policy/CognitoAdminPolicy';

async function reAttachCognitoPolicy() {
  console.log('🔧 Re-attaching CognitoAdminPolicy to Role...');
  
  try {
    const iamClient = new IAMClient({ region: REGION });
    
    // Step 1: Check current attached policies
    console.log('🔍 Step 1: Checking current attached policies...');
    
    const listPoliciesCommand = new ListAttachedRolePoliciesCommand({
      RoleName: ROLE_NAME
    });
    
    const policies = await iamClient.send(listPoliciesCommand);
    console.log('✅ Current attached policies:');
    
    if (policies.AttachedPolicies && policies.AttachedPolicies.length > 0) {
      policies.AttachedPolicies.forEach(policy => {
        console.log(`  - ${policy.PolicyName} (${policy.PolicyArn})`);
      });
    } else {
      console.log('  - No attached policies found');
    }
    
    // Step 2: Detach the policy if it's already attached
    console.log('\n🔍 Step 2: Detaching CognitoAdminPolicy if already attached...');
    
    try {
      const detachCommand = new DetachRolePolicyCommand({
        RoleName: ROLE_NAME,
        PolicyArn: POLICY_ARN
      });
      
      await iamClient.send(detachCommand);
      console.log('✅ CognitoAdminPolicy detached successfully');
    } catch (error) {
      if (error.name === 'NoSuchEntity') {
        console.log('ℹ️ CognitoAdminPolicy was not attached');
      } else {
        console.log('⚠️ Error detaching policy:', error.message);
      }
    }
    
    // Step 3: Re-attach the policy
    console.log('\n🔍 Step 3: Re-attaching CognitoAdminPolicy...');
    
    const attachCommand = new AttachRolePolicyCommand({
      RoleName: ROLE_NAME,
      PolicyArn: POLICY_ARN
    });
    
    await iamClient.send(attachCommand);
    console.log('✅ CognitoAdminPolicy re-attached successfully');
    
    // Step 4: Verify the attachment
    console.log('\n🔍 Step 4: Verifying policy attachment...');
    
    const verifyPolicies = await iamClient.send(listPoliciesCommand);
    console.log('✅ Updated attached policies:');
    
    if (verifyPolicies.AttachedPolicies && verifyPolicies.AttachedPolicies.length > 0) {
      verifyPolicies.AttachedPolicies.forEach(policy => {
        console.log(`  - ${policy.PolicyName} (${policy.PolicyArn})`);
      });
    } else {
      console.log('  - No attached policies found');
    }
    
    console.log('\n📊 Summary:');
    console.log('✅ Policy re-attachment completed');
    console.log('✅ Please try creating a user in the browser now');
    console.log('🔧 If it still doesn\'t work, we may need to check the policy content');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error details:', error);
    
    if (error.name === 'AccessDenied') {
      console.log('\n🚨 ACCESS DENIED: The CLI user does not have IAM permissions.');
      console.log('🔧 Please manually re-attach the CognitoAdminPolicy in the AWS Console:');
      console.log('1. Go to IAM > Roles');
      console.log('2. Find: amplify-contractgenerator-production-78963-authRole');
      console.log('3. Click on it');
      console.log('4. Go to "Permissions" tab');
      console.log('5. Click "Add permissions" > "Attach policies"');
      console.log('6. Search for "CognitoAdminPolicy"');
      console.log('7. Select it and click "Add permissions"');
    }
  }
}

reAttachCognitoPolicy().catch(console.error); 