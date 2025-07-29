import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports.js';

Amplify.configure(awsconfig);

async function checkUserStatus() {
  try {
    console.log('🔍 Checking current user status...');
    
    // Check if there's a current user
    const user = await getCurrentUser();
    console.log('✅ Current user:', user.username);
    
    // Get user attributes
    const attributes = await fetchUserAttributes();
    console.log('📋 User attributes:', attributes);
    
    // Get auth session
    const session = await fetchAuthSession();
    console.log('🔐 Auth session:', {
      isSignedIn: session.tokens !== undefined,
      accessToken: session.tokens?.accessToken ? 'Present' : 'None',
      idToken: session.tokens?.idToken ? 'Present' : 'None'
    });
    
  } catch (error) {
    console.log('❌ No current user found');
    console.log('💡 You need to sign in first');
  }
}

checkUserStatus();