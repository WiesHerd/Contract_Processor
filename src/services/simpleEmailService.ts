import { fetchAuthSession } from 'aws-amplify/auth';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';

// Professional email configuration
const EMAIL_CONFIG = {
  fromEmail: 'wherdzik@gmail.com',
  supportEmail: 'wherdzik@gmail.com',
  appName: 'Contract Engine',
  appUrl: 'https://your-production-domain.com',
  companyName: 'Contract Engine Inc.'
};

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Professional branded welcome email service
export async function sendWelcomeEmailDirect(
  toEmail: string,
  username: string,
  tempPassword: string,
  firstName: string = ''
): Promise<EmailResponse> {
  try {
    console.log('📧 Sending professional welcome email to:', toEmail);
    
    // Get authenticated session
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No credentials available in session');
    }
    
    // Create SES client with session credentials
    const client = new SESClient({
      region: REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
    
    // Professional branded welcome email with actual ContractEngine logo
    const subject = `Welcome to ${EMAIL_CONFIG.appName} - Your Account is Ready`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${EMAIL_CONFIG.appName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f8f9fa; 
          }
          .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .logo-container { 
            display: inline-flex; 
            align-items: center; 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .logo-svg { 
            width: 48px; 
            height: 48px; 
          }
          .logo-text { 
            font-size: 24px; 
            font-weight: bold; 
            color: white; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .welcome-text { 
            font-size: 18px; 
            margin-bottom: 30px; 
            color: #555; 
          }
          .credentials-card { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            border: 2px solid #dee2e6; 
            border-radius: 12px; 
            padding: 25px; 
            margin: 25px 0; 
          }
          .credentials-title { 
            font-size: 20px; 
            font-weight: 600; 
            color: #495057; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
            gap: 10px; 
          }
          .credential-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 0; 
            border-bottom: 1px solid #e9ecef; 
          }
          .credential-row:last-child { 
            border-bottom: none; 
          }
          .credential-label { 
            font-weight: 600; 
            color: #495057; 
          }
          .credential-value { 
            background: white; 
            padding: 10px 15px; 
            border-radius: 8px; 
            border: 2px solid #2563eb; 
            font-family: 'Courier New', monospace; 
            font-size: 16px; 
            font-weight: bold; 
            color: #1e40af; 
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1); 
          }
          .warning-box { 
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
            border: 2px solid #ffc107; 
            border-radius: 12px; 
            padding: 20px; 
            margin: 25px 0; 
          }
          .warning-title { 
            font-size: 16px; 
            font-weight: 600; 
            color: #856404; 
            margin-bottom: 10px; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
          }
          .cta-section { 
            text-align: center; 
            margin: 35px 0; 
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
            color: white !important; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s ease; 
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); 
          }
          .cta-button:hover { 
            transform: translateY(-2px); 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 30px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
          }
          .footer-links { 
            margin-bottom: 15px; 
          }
          .footer-links a { 
            color: #2563eb; 
            text-decoration: none; 
            margin: 0 10px; 
          }
          .footer-links a:hover { 
            text-decoration: underline; 
          }
          .security-note { 
            background: #e3f2fd; 
            border: 1px solid #2196f3; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 20px 0; 
            font-size: 14px; 
            color: #1976d2; 
          }
          @media (max-width: 600px) {
            .email-container { margin: 10px; }
            .content { padding: 25px 20px; }
            .header { padding: 30px 20px; }
            .credential-row { flex-direction: column; align-items: flex-start; gap: 8px; }
            .credential-value { font-size: 14px; padding: 8px 12px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo-container">
              <svg class="logo-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,4 28,10 28,22 16,28 4,22 4,10" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.1)"/>
                <polygon points="16,28 28,22 28,10 16,16" fill="rgba(255,255,255,0.3)" opacity="0.85"/>
                <polygon points="28,10 22,7 16,10 16,16" fill="rgba(255,255,255,0.2)" opacity="0.9"/>
                <polyline points="16,4 16,16 28,22" stroke="white" stroke-width="1.2" fill="none" opacity="0.8"/>
                <polyline points="16,16 4,22" stroke="white" stroke-width="1.2" fill="none" opacity="0.8"/>
              </svg>
              <span class="logo-text">Contract Engine</span>
            </div>
            <h1 style="font-size: 28px; margin-bottom: 10px;">Welcome!</h1>
            <p style="font-size: 16px; opacity: 0.9;">Your account has been successfully created</p>
          </div>
          
          <div class="content">
            <div class="welcome-text">
              <h2 style="color: #495057; margin-bottom: 15px;">Hello ${firstName || username.split('.')[0] || 'there'},</h2>
              <p>Welcome to <strong>Contract Engine</strong>! We're excited to have you on board. Your account has been successfully created and you can start using our platform immediately.</p>
            </div>
            
            <div class="credentials-card">
              <div class="credentials-title">
                🔐 Your Login Credentials
              </div>
              <div class="credential-row">
                <span class="credential-label">Username:</span>
                <span class="credential-value">${username}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${tempPassword}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Login URL:</span>
                <span class="credential-value">${EMAIL_CONFIG.appUrl}</span>
              </div>
            </div>
            
            <div class="warning-box">
              <div class="warning-title">
                ⚠️ Important Security Notice
              </div>
              <p style="color: #856404; margin: 0;">You must change your password on your first login for security purposes. This helps ensure your account remains secure.</p>
            </div>
            
            <div class="security-note">
              <strong>🔒 Security Tip:</strong> Choose a strong password that includes uppercase and lowercase letters, numbers, and special characters.
            </div>
            
            <div class="cta-section">
              <a href="${EMAIL_CONFIG.appUrl}" class="cta-button">
                🚀 Sign In Now
              </a>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <h3 style="color: #495057; margin-bottom: 15px;">What's Next?</h3>
              <ul style="color: #6c757d; line-height: 1.8;">
                <li>Sign in with your credentials above</li>
                <li>Change your password on first login</li>
                <li>Explore the platform features</li>
                <li>Upload your first provider data</li>
                <li>Generate your first contract</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-links">
              <a href="${EMAIL_CONFIG.appUrl}">Home</a> |
              <a href="mailto:${EMAIL_CONFIG.supportEmail}">Support</a> |
              <a href="${EMAIL_CONFIG.appUrl}/docs">Documentation</a>
            </div>
            <p>This is an automated message from ${EMAIL_CONFIG.appName}. Please do not reply to this email.</p>
            <p>If you have any questions, please contact <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="color: #2563eb;">${EMAIL_CONFIG.supportEmail}</a></p>
            <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
              © ${new Date().getFullYear()} ${EMAIL_CONFIG.companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textBody = `
      Welcome to ${EMAIL_CONFIG.appName}!
      
      Hello ${firstName || username.split('.')[0] || 'there'},
      
      Welcome to ${EMAIL_CONFIG.appName}! We're excited to have you on board. 
      Your account has been successfully created and you can start using our platform immediately.
      
      ┌─────────────────────────────────────────────────────────────┐
      │                    YOUR LOGIN CREDENTIALS                  │
      ├─────────────────────────────────────────────────────────────┤
      │ Username:        ${username}                               │
      │ Temporary Pass:  ${tempPassword}                           │
      │ Login URL:       ${EMAIL_CONFIG.appUrl}                   │
      └─────────────────────────────────────────────────────────────┘
      
      ⚠️  IMPORTANT: You must change your password on your first login for security.
      
      🔒 Security Tip: Choose a strong password that includes uppercase and lowercase 
         letters, numbers, and special characters.
      
      🚀 Ready to get started? Visit: ${EMAIL_CONFIG.appUrl}
      
      What's Next?
      • Sign in with your credentials above
      • Change your password on first login
      • Explore the platform features
      • Upload your first provider data
      • Generate your first contract
      
      ───────────────────────────────────────────────────────────────
      
      This is an automated message from ${EMAIL_CONFIG.appName}. 
      Please do not reply to this email.
      
      If you have any questions, please contact: ${EMAIL_CONFIG.supportEmail}
      
      © ${new Date().getFullYear()} ${EMAIL_CONFIG.companyName}. All rights reserved.
    `;
    
    // Send email via SES
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
    console.log('✅ Professional welcome email sent successfully via SES:', result.MessageId);
    
    return {
      success: true,
      messageId: result.MessageId,
    };
    
  } catch (error: any) {
    console.error('❌ Error sending professional welcome email via SES:', error);
    
    return {
      success: false,
      error: error.message,
    };
  }
} 