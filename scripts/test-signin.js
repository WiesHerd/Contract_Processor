import { Amplify } from 'aws-amplify';
import { signIn } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports.js';

Amplify.configure(awsconfig);

// Replace this with your new password
const email = 'wherdzik@gmail.com';
const password = 'YourNewPassword123!'; // Replace with your actual new password

async function testSignIn() {
  try {
    console.log(`🔐 Testing sign-in for: ${email}`);
    
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password: password
    });
    
    if (isSignedIn) {
      console.log('✅ Sign-in successful!');
    } else {
      console.log('⚠️ Sign-in not complete:', nextStep);
    }
    
  } catch (error) {
    console.log('❌ Sign-in failed:', error.message);
    
    if (error.message.includes('NotAuthorizedException')) {
      console.log('💡 Incorrect email or password');
    } else if (error.message.includes('UserNotConfirmedException')) {
      console.log('💡 Account not confirmed');
    } else {
      console.log('💡 Please check your credentials');
    }
  }
}

testSignIn();