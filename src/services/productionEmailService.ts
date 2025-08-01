import { fetchAuthSession } from 'aws-amplify/auth';

// Production email service that calls Lambda function
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Production configuration
const PRODUCTION_CONFIG = {
  lambdaUrl: 'https://your-api-gateway-url.amazonaws.com/prod/email-service',
  appName: 'Contract Engine',
  appUrl: 'https://your-production-domain.com',
  companyName: 'Contract Engine Inc.'
};

// Development configuration
const DEVELOPMENT_CONFIG = {
  lambdaUrl: 'http://localhost:3000/email-service',
  appName: 'Contract Engine (Dev)',
  appUrl: 'http://localhost:3000',
  companyName: 'Contract Engine Dev'
};

const EMAIL_CONFIG = process.env.NODE_ENV === 'production' 
  ? PRODUCTION_CONFIG 
  : DEVELOPMENT_CONFIG;

export async function sendWelcomeEmailViaLambda(
  toEmail: string,
  username: string,
  tempPassword: string,
  firstName: string = ''
): Promise<EmailResponse> {
  try {
    console.log('📧 Sending welcome email via Lambda to:', toEmail);
    
    // Get authenticated session
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Prepare email data
    const emailData = {
      type: 'welcome',
      toEmail,
      username,
      tempPassword,
      firstName,
      appName: EMAIL_CONFIG.appName,
      appUrl: EMAIL_CONFIG.appUrl,
      companyName: EMAIL_CONFIG.companyName
    };
    
    // Call Lambda function
    const response = await fetch(EMAIL_CONFIG.lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.tokens?.accessToken?.toString() || ''}`
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Welcome email sent successfully via Lambda:', result.messageId);
      return {
        success: true,
        messageId: result.messageId
      };
    } else {
      console.error('❌ Lambda email failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error: any) {
    console.error('❌ Error sending welcome email via Lambda:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function sendPasswordResetEmailViaLambda(
  toEmail: string,
  username: string,
  resetCode: string,
  firstName: string = ''
): Promise<EmailResponse> {
  try {
    console.log('📧 Sending password reset email via Lambda to:', toEmail);
    
    // Get authenticated session
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Prepare email data
    const emailData = {
      type: 'password-reset',
      toEmail,
      username,
      resetCode,
      firstName,
      appName: EMAIL_CONFIG.appName,
      appUrl: EMAIL_CONFIG.appUrl,
      companyName: EMAIL_CONFIG.companyName
    };
    
    // Call Lambda function
    const response = await fetch(EMAIL_CONFIG.lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.tokens?.accessToken?.toString() || ''}`
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Password reset email sent successfully via Lambda:', result.messageId);
      return {
        success: true,
        messageId: result.messageId
      };
    } else {
      console.error('❌ Lambda password reset email failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error: any) {
    console.error('❌ Error sending password reset email via Lambda:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 