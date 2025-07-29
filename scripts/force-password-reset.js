import { Amplify } from 'aws-amplify';
import { resetPassword } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports.js';

Amplify.configure(awsconfig);

const email = 'wherdzik@gmail.com';

async function forcePasswordReset() {
  try {
    console.log(`📧 Initiating password reset for: ${email}`);
    
    await resetPassword({
      username: email
    });
    
    console.log('✅ Password reset initiated successfully');
    console.log('📧 Check your email for the verification code');
    
  } catch (error) {
    console.log('❌ Error resetting password:', error.message);
    
    if (error.message.includes('Attempt limit exceeded')) {
      console.log('💡 Too many attempts. Please wait before trying again.');
    } else if (error.message.includes('UserNotFoundException')) {
      console.log('💡 User not found. Please check the email address.');
    } else {
      console.log('💡 Please try again or contact support.');
    }
  }
}

forcePasswordReset();