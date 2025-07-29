import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const checkRateLimitStatus = async () => {
  const email = 'wherdzik@gmail.com';
  
  console.log('🔍 Checking rate limit status for:', email);
  console.log('⏰ This will help determine if rate limits have reset...\n');
  
  try {
    const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });
    const command = new AdminGetUserCommand({
      UserPoolId: 'us-east-2_ldPO5ZKCR',
      Username: email
    });
    
    const response = await client.send(command);
    
    console.log('✅ User account found and accessible!');
    console.log('📊 Account Status:', response.UserStatus);
    console.log('📅 Last Modified:', response.UserLastModifiedDate);
    
    if (response.UserStatus === 'CONFIRMED') {
      console.log('✅ Account is confirmed and ready for sign-in');
      console.log('💡 Rate limits may have reset - try signing in now');
    } else if (response.UserStatus === 'FORCE_CHANGE_PASSWORD') {
      console.log('⚠️ Account requires password change');
      console.log('💡 Use password reset flow to set new password');
    } else {
      console.log('⚠️ Account status:', response.UserStatus);
      console.log('💡 May need email confirmation or other action');
    }
    
  } catch (error) {
    console.log('📊 Rate Limit Analysis:');
    
    if (error.name === 'AccessDeniedException') {
      console.log('❌ AWS permissions issue - cannot check user status');
      console.log('💡 Try signing in directly in the app to test rate limits');
    } else if (error.name === 'UserNotFoundException') {
      console.log('❌ User account not found');
      console.log('📧 Check if the email address is correct');
    } else if (error.name === 'TooManyRequestsException' || 
               error.name === 'LimitExceededException') {
      console.log('❌ Still rate limited');
      console.log('⏰ Wait time: 15-30 minutes from first failed attempt');
      console.log('💡 Try again in a few minutes');
    } else {
      console.log('❓ Error checking user status:', error.message);
      console.log('🔍 This might indicate rate limiting or other issues');
    }
  }
  
  console.log('\n📋 Rate Limit Reference:');
  console.log('• Sign-in attempts: 15-30 minute reset');
  console.log('• Password reset attempts: 1 hour reset');
  console.log('• Account lockout: 24 hours (if configured)');
  console.log('\n💡 Tip: Use "Forgot password?" as an alternative while waiting');
  console.log('\n🔍 To check if rate limits have reset:');
  console.log('1. Try signing in with any password in the app');
  console.log('2. If you get "Incorrect username or password" - rate limit is RESET');
  console.log('3. If you get "Too many attempts" - still rate limited');
};

// Run the check
checkRateLimitStatus().catch(console.error); 