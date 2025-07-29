import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports.js';

Amplify.configure(awsconfig);

const email = 'wherdzik@gmail.com';
const testPasswords = [
  'TempPass123!',
  'NewPassword123!',
  'Password123!',
  'Test123!'
];

async function testSignIn() {
  console.log('🔐 Testing sign-in for:', email);
  console.log('📧 Testing with different password combinations...\n');

  for (const password of testPasswords) {
    try {
      console.log(`🔄 Testing password: ${password}`);
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password
      });
      
      if (isSignedIn) {
        console.log('✅ Sign-in successful!');
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        console.log('👤 User details:', {
          username: user.username,
          attributes: attributes
        });
        return;
      } else {
        console.log('⚠️ Sign-in not complete:', nextStep);
      }
    } catch (error) {
      console.log(`❌ Sign-in failed with "${password}":`, error.message);
      
      if (error.message.includes('NotAuthorizedException')) {
        console.log('💡 Incorrect password');
      } else if (error.message.includes('UserNotConfirmedException')) {
        console.log('💡 Account not confirmed - check email for verification');
      } else if (error.message.includes('UserNotFoundException')) {
        console.log('💡 User not found - account may not exist');
      } else if (error.message.includes('TooManyRequestsException')) {
        console.log('💡 Rate limited - wait a moment before trying again');
      } else {
        console.log('💡 Other error - check console for details');
      }
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('🔍 All password attempts failed. Please:');
  console.log('1. Check your email for the password reset code');
  console.log('2. Use the password reset flow in the app');
  console.log('3. Make sure you\'re using the correct email address');
}

testSignIn();