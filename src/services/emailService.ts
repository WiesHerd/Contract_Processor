import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { SESClient, SendEmailCommand, GetSendQuotaCommand, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const EMAIL_CONFIG = {
  fromEmail: 'wherdzik@gmail.com', // Fixed: added the 'w'
  appName: 'Contract Engine',
  appUrl: window.location.origin, // Use the current app URL
  supportEmail: 'wherdzik@gmail.com', // Fixed: added the 'w'
  companyName: 'Contract Engine',
  logoUrl: `${window.location.origin}/logo.png` // Add your logo URL
};

// Professional email templates inspired by Microsoft/Google enterprise onboarding
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Contract Engine - Your Account is Ready',
    html: (data: { username: string; email: string; tempPassword: string; firstName: string; appName: string; appUrl: string; supportEmail: string; companyName: string; logoUrl: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${data.appName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
        .logo { width: 120px; height: auto; margin-bottom: 20px; }
        .content { padding: 40px 30px; }
        .welcome-text { font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; }
        .subtitle { font-size: 16px; color: #666; margin-bottom: 30px; }
        .credentials-box { background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .credential-item { margin: 15px 0; }
        .label { font-weight: 600; color: #495057; margin-bottom: 5px; }
        .value { font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #dee2e6; color: #495057; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .warning-icon { color: #856404; font-weight: bold; }
        .steps { margin: 30px 0; }
        .step { margin: 20px 0; padding-left: 20px; }
        .step-number { background-color: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; }
        .security-note { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .security-icon { color: #0c5460; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${data.logoUrl}" alt="${data.appName}" class="logo">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${data.appName}</h1>
        </div>
        
        <div class="content">
            <div class="welcome-text">Hello ${data.firstName},</div>
            <div class="subtitle">
                Welcome to ${data.appName}! Your account has been successfully created and you're now part of our enterprise contract management platform.
            </div>
            
            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #495057;">Your Login Credentials</h3>
                <div class="credential-item">
                    <div class="label">Username:</div>
                    <div class="value">${data.username}</div>
                </div>
                <div class="credential-item">
                    <div class="label">Temporary Password:</div>
                    <div class="value">${data.tempPassword}</div>
                </div>
                <div class="credential-item">
                    <div class="label">Login URL:</div>
                    <div class="value">${data.appUrl}</div>
                </div>
            </div>
            
            <div class="warning">
                <div class="warning-icon">⚠️ Important Security Notice</div>
                <p style="margin: 10px 0 0 0; color: #856404;">
                    For your security, you <strong>must change your password</strong> on your first login. 
                    This temporary password will expire after 24 hours.
                </p>
            </div>
            
            <div class="steps">
                <h3 style="color: #495057;">Getting Started</h3>
                <div class="step">
                    <span class="step-number">1</span>
                    <strong>Sign In:</strong> Visit ${data.appUrl} and sign in with your credentials above
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    <strong>Change Password:</strong> You'll be prompted to create a new, secure password
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    <strong>Verify Email:</strong> Confirm your email address to activate your account
                </div>
                <div class="step">
                    <span class="step-number">4</span>
                    <strong>Start Working:</strong> Access your dashboard and begin managing contracts
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.appUrl}" class="button">Sign In Now</a>
            </div>
            
            <div class="security-note">
                <div class="security-icon">🔒 Security Best Practices</div>
                <ul style="margin: 10px 0 0 0; color: #0c5460;">
                    <li>Use a strong, unique password</li>
                    <li>Enable two-factor authentication if available</li>
                    <li>Never share your credentials</li>
                    <li>Log out when using shared devices</li>
                </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <h4 style="color: #495057; margin-bottom: 10px;">Need Help?</h4>
                <p style="color: #6c757d; margin: 5px 0;">
                    • <strong>Technical Support:</strong> ${data.supportEmail}<br>
                    • <strong>Documentation:</strong> ${data.appUrl}/docs<br>
                    • <strong>Training:</strong> ${data.appUrl}/training
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                This is an automated message from ${data.companyName}. 
                Please do not reply to this email.
            </p>
            <p style="margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} ${data.companyName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`,
    text: (data: { username: string; email: string; tempPassword: string; firstName: string; appName: string; appUrl: string; supportEmail: string; companyName: string }) => `
Welcome to ${data.appName}!

Hello ${data.firstName},

Welcome to ${data.appName}! Your account has been successfully created and you're now part of our enterprise contract management platform.

YOUR LOGIN CREDENTIALS:
Username: ${data.username}
Temporary Password: ${data.tempPassword}
Login URL: ${data.appUrl}

IMPORTANT SECURITY NOTICE:
For your security, you MUST change your password on your first login. This temporary password will expire after 24 hours.

GETTING STARTED:
1. Sign In: Visit ${data.appUrl} and sign in with your credentials above
2. Change Password: You'll be prompted to create a new, secure password
3. Verify Email: Confirm your email address to activate your account
4. Start Working: Access your dashboard and begin managing contracts

SECURITY BEST PRACTICES:
• Use a strong, unique password
• Enable two-factor authentication if available
• Never share your credentials
• Log out when using shared devices

NEED HELP?
• Technical Support: ${data.supportEmail}
• Documentation: ${data.appUrl}/docs
• Training: ${data.appUrl}/training

This is an automated message from ${data.companyName}. Please do not reply to this email.

© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.`
  },

  passwordReset: {
    subject: 'Password Reset Request - Contract Engine',
    html: (data: { username: string; email: string; tempPassword: string; firstName: string; appName: string; appUrl: string; supportEmail: string; companyName: string; logoUrl: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - ${data.appName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
        .logo { width: 120px; height: auto; margin-bottom: 20px; }
        .content { padding: 40px 30px; }
        .title { font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; }
        .subtitle { font-size: 16px; color: #666; margin-bottom: 30px; }
        .credentials-box { background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .credential-item { margin: 15px 0; }
        .label { font-weight: 600; color: #495057; margin-bottom: 5px; }
        .value { font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #dee2e6; color: #495057; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .warning-icon { color: #856404; font-weight: bold; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${data.logoUrl}" alt="${data.appName}" class="logo">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        
        <div class="content">
            <div class="title">Hello ${data.firstName},</div>
            <div class="subtitle">
                A password reset was requested for your ${data.appName} account. Here are your new temporary credentials:
            </div>
            
            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #495057;">Your New Credentials</h3>
                <div class="credential-item">
                    <div class="label">Username:</div>
                    <div class="value">${data.username}</div>
                </div>
                <div class="credential-item">
                    <div class="label">New Temporary Password:</div>
                    <div class="value">${data.tempPassword}</div>
                </div>
                <div class="credential-item">
                    <div class="label">Login URL:</div>
                    <div class="value">${data.appUrl}</div>
                </div>
            </div>
            
            <div class="warning">
                <div class="warning-icon">⚠️ Important Security Notice</div>
                <p style="margin: 10px 0 0 0; color: #856404;">
                    You <strong>must change your password</strong> on your next login. 
                    This temporary password will expire after 24 hours.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.appUrl}" class="button">Sign In Now</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <h4 style="color: #495057; margin-bottom: 10px;">Security Reminder</h4>
                <p style="color: #6c757d; margin: 5px 0;">
                    If you didn't request this password reset, please contact support immediately at ${data.supportEmail}
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                This is an automated message from ${data.companyName}. 
                Please do not reply to this email.
            </p>
            <p style="margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} ${data.companyName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`,
    text: (data: { username: string; email: string; tempPassword: string; firstName: string; appName: string; appUrl: string; supportEmail: string; companyName: string }) => `
Password Reset - ${data.appName}

Hello ${data.firstName},

A password reset was requested for your ${data.appName} account. Here are your new temporary credentials:

YOUR NEW CREDENTIALS:
Username: ${data.username}
New Temporary Password: ${data.tempPassword}
Login URL: ${data.appUrl}

IMPORTANT SECURITY NOTICE:
You MUST change your password on your next login. This temporary password will expire after 24 hours.

SECURITY REMINDER:
If you didn't request this password reset, please contact support immediately at ${data.supportEmail}

This is an automated message from ${data.companyName}. Please do not reply to this email.

© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.`
  }
};

// Send email using SES
export async function sendEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📧 Sending email to: ${toEmail}`);
    console.log(`📧 Subject: ${subject}`);
    
    // Get authenticated user credentials
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create authenticated SES client
    const client = new SESClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const command = new SendEmailCommand({
      Source: EMAIL_CONFIG.fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });
    
    const result = await client.send(command);
    console.log(`✅ Email sent successfully. Message ID: ${result.MessageId}`);
    
    return {
      success: true,
      messageId: result.MessageId,
    };
    
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    
    // Handle specific SES errors
    if (error.name === 'MessageRejected') {
      return {
        success: false,
        error: 'Email rejected by SES. The email address may be invalid or not verified.',
      };
    } else if (error.name === 'MailFromDomainNotVerifiedException') {
      return {
        success: false,
        error: 'SES configuration issue: From email domain not verified.',
      };
    } else if (error.name === 'AccountSendingPausedException') {
      return {
        success: false,
        error: 'SES account is paused. Please contact AWS support.',
      };
    } else if (error.name === 'SendingPausedException') {
      return {
        success: false,
        error: 'SES sending is paused for this region.',
      };
    } else {
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
      };
    }
  }
}

// Send welcome email
export async function sendWelcomeEmail(
  toEmail: string,
  username: string,
  tempPassword: string,
  firstName: string = ''
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateData = {
    username,
    email: toEmail,
    tempPassword,
    firstName: firstName || username.split('.')[0] || 'there', // Use first part of username if no firstName
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail,
    companyName: EMAIL_CONFIG.companyName,
    logoUrl: EMAIL_CONFIG.logoUrl
  };
  const template = EMAIL_TEMPLATES.welcome;
  const htmlBody = template.html(templateData);
  const textBody = template.text(templateData);
  
  return sendEmail(toEmail, template.subject, htmlBody, textBody);
}

// Send password reset email
export async function sendPasswordResetEmail(
  toEmail: string,
  username: string,
  tempPassword: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateData = {
    username,
    email: toEmail,
    tempPassword,
    firstName: username.split('.')[0] || 'there', // Use first part of username
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail,
    companyName: EMAIL_CONFIG.companyName,
    logoUrl: EMAIL_CONFIG.logoUrl
  };
  const template = EMAIL_TEMPLATES.passwordReset;
  const htmlBody = template.html(templateData);
  const textBody = template.text(templateData);
  
  return sendEmail(toEmail, template.subject, htmlBody, textBody);
}

// Check SES configuration
export async function checkSESConfiguration(): Promise<{
  isConfigured: boolean;
  isVerified: boolean;
  sendingQuota: number;
  sentToday: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    const client = new SESClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // Check sending quota
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResult = await client.send(quotaCommand);
    
    // Check if from email is verified
    const verificationCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [EMAIL_CONFIG.fromEmail],
    });
    const verificationResult = await client.send(verificationCommand);
    
    const isVerified = verificationResult.VerificationAttributes?.[EMAIL_CONFIG.fromEmail]?.VerificationStatus === 'Success';
    
    return {
      isConfigured: true,
      isVerified,
      sendingQuota: quotaResult.Max24HourSend || 0,
      sentToday: quotaResult.SentLast24Hours || 0,
    };
    
  } catch (error: any) {
    console.error('❌ Error checking SES configuration:', error);
    return {
      isConfigured: false,
      isVerified: false,
      sendingQuota: 0,
      sentToday: 0,
      error: error.message,
    };
  }
}

// Verify email address in SES
export async function verifyEmailAddress(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    const client = new SESClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });
    
    await client.send(command);
    console.log(`✅ Verification email sent to: ${email}`);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Error verifying email address:', error);
    return {
      success: false,
      error: error.message,
    };
  }
} 