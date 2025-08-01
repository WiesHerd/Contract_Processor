import { fetchAuthSession } from 'aws-amplify/auth';

// Lambda function endpoint (you'll need to update this with your actual API Gateway URL)
const LAMBDA_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-gateway-url.amazonaws.com/prod/adminUserManagement' 
  : 'http://localhost:3000/adminUserManagement'; // For local testing

export interface EmailData {
  toEmail: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  emailType: 'welcome' | 'password-reset';
  username?: string;
  tempPassword?: string;
  firstName?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  message?: string;
}

// Send email through Lambda function
export async function sendEmailViaLambda(emailData: EmailData): Promise<EmailResponse> {
  try {
    console.log('📧 Sending email via Lambda:', emailData.toEmail);
    
    // Get authenticated session for API call
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Prepare the request
    const requestBody = {
      ...emailData,
      // Add any additional data needed by the Lambda function
    };
    
    // Make the API call to the Lambda function
    const response = await fetch(`${LAMBDA_API_URL}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.tokens?.accessToken?.toString() || ''}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to send email'}`);
    }
    
    const result = await response.json();
    console.log('✅ Email sent successfully via Lambda:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: result.message,
    };
    
  } catch (error: any) {
    console.error('❌ Error sending email via Lambda:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email via Lambda',
    };
  }
}

// Send welcome email through Lambda
export async function sendWelcomeEmailViaLambda(
  toEmail: string,
  username: string,
  tempPassword: string,
  firstName: string = ''
): Promise<EmailResponse> {
  const emailData: EmailData = {
    toEmail,
    emailType: 'welcome',
    username,
    tempPassword,
    firstName,
  };
  
  return sendEmailViaLambda(emailData);
}

// Send password reset email through Lambda
export async function sendPasswordResetEmailViaLambda(
  toEmail: string,
  username: string,
  tempPassword: string
): Promise<EmailResponse> {
  const emailData: EmailData = {
    toEmail,
    emailType: 'password-reset',
    username,
    tempPassword,
  };
  
  return sendEmailViaLambda(emailData);
} 