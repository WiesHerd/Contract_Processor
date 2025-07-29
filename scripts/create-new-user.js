import { Amplify } from 'aws-amplify';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports.js';

Amplify.configure(awsconfig);

const email = 'wherdzik2@gmail.com'; // Use a different email
const password = 'SecurePass123!';
const firstName = 'Test';
const lastName = 'User';

async function createNewUser() {
  try {
    console.log('📝 Creating new user account...');
    console.log('📧 Email:', email);
    console.log('🔐 Password:', password);
    console.log('👤 Name:', `${firstName} ${lastName}`);
    console.log('');

    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email,
      password: password,
      options: {
        userAttributes: {
          email: email,
          given_name: firstName,
          family_name: lastName
        }
      }
    });

    if (isSignUpComplete) {
      console.log('✅ User created successfully!');
      console.log('🆔 User ID:', userId);
      console.log('📧 Check your email for verification code');
      console.log('');
      console.log('💡 Next steps:');
      console.log('1. Check your email for the verification code');
      console.log('2. Use the verification code to confirm your account');
      console.log('3. Then you can sign in normally');
    } else {
      console.log('⚠️ Sign-up not complete:', nextStep);
    }
  } catch (error) {
    console.log('❌ Error creating user:', error.message);
    
    if (error.message.includes('UsernameExistsException')) {
      console.log('💡 User already exists - try a different email');
    } else if (error.message.includes('InvalidPasswordException')) {
      console.log('💡 Password doesn\'t meet requirements');
    } else {
      console.log('💡 Please try again or contact support');
    }
  }
}

createNewUser();