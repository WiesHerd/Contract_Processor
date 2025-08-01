#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';
const TO_EMAIL = 'wherdzik@gmail.com';

async function testProfessionalWelcomeEmail() {
  console.log('📧 Testing Professional Welcome Email to wherdzik@gmail.com...\n');

  try {
    const client = new SESClient({ region: REGION });
    
    const subject = 'Welcome to Contract Engine - Your Account is Ready';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Contract Engine</title>
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
          .logo { 
            width: 200px; 
            height: 60px; 
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 8px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 20px; 
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
            padding: 8px 12px; 
            border-radius: 6px; 
            border: 1px solid #dee2e6; 
            font-family: 'Courier New', monospace; 
            font-size: 14px; 
            color: #212529; 
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s ease; 
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
            color: #667eea; 
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
            .credential-row { flex-direction: column; align-items: flex-start; gap: 5px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">Contract Engine</div>
            <h1 style="font-size: 28px; margin-bottom: 10px;">Welcome!</h1>
            <p style="font-size: 16px; opacity: 0.9;">Your account has been successfully created</p>
          </div>
          
          <div class="content">
            <div class="welcome-text">
              <h2 style="color: #495057; margin-bottom: 15px;">Hello Test User,</h2>
              <p>Welcome to <strong>Contract Engine</strong>! We're excited to have you on board. Your account has been successfully created and you can start using our platform immediately.</p>
            </div>
            
            <div class="credentials-card">
              <div class="credentials-title">
                🔐 Your Login Credentials
              </div>
              <div class="credential-row">
                <span class="credential-label">Username:</span>
                <span class="credential-value">test.user</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">TestPass123!</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Login URL:</span>
                <span class="credential-value">https://your-production-domain.com</span>
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
              <a href="https://your-production-domain.com" class="cta-button">
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
              <a href="https://your-production-domain.com">Home</a> |
              <a href="mailto:wherdzik@gmail.com">Support</a> |
              <a href="https://your-production-domain.com/docs">Documentation</a>
            </div>
            <p>This is an automated message from Contract Engine. Please do not reply to this email.</p>
            <p>If you have any questions, please contact <a href="mailto:wherdzik@gmail.com" style="color: #667eea;">wherdzik@gmail.com</a></p>
            <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
              © ${new Date().getFullYear()} Contract Engine Inc. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textBody = `
      Welcome to Contract Engine!
      
      Hello Test User,
      
      Welcome to Contract Engine! We're excited to have you on board. 
      Your account has been successfully created and you can start using our platform immediately.
      
      ┌─────────────────────────────────────────────────────────────┐
      │                    YOUR LOGIN CREDENTIALS                  │
      ├─────────────────────────────────────────────────────────────┤
      │ Username:        test.user                                │
      │ Temporary Pass:  TestPass123!                             │
      │ Login URL:       https://your-production-domain.com       │
      └─────────────────────────────────────────────────────────────┘
      
      ⚠️  IMPORTANT: You must change your password on your first login for security.
      
      🔒 Security Tip: Choose a strong password that includes uppercase and lowercase 
         letters, numbers, and special characters.
      
      🚀 Ready to get started? Visit: https://your-production-domain.com
      
      What's Next?
      • Sign in with your credentials above
      • Change your password on first login
      • Explore the platform features
      • Upload your first provider data
      • Generate your first contract
      
      ───────────────────────────────────────────────────────────────
      
      This is an automated message from Contract Engine. 
      Please do not reply to this email.
      
      If you have any questions, please contact: wherdzik@gmail.com
      
      © ${new Date().getFullYear()} Contract Engine Inc. All rights reserved.
    `;
    
    console.log('📤 Sending professional welcome email...');
    
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [TO_EMAIL],
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
    
    console.log('✅ Professional welcome email sent successfully!');
    console.log(`📧 Message ID: ${result.MessageId}`);
    console.log(`📬 Check your email at: ${TO_EMAIL}`);
    console.log('\n💡 IMPORTANT: Check your spam/junk folder if you don\'t see it in your inbox!');
    console.log('\n🎯 This email features:');
    console.log('   - Professional branding and design');
    console.log('   - Responsive layout');
    console.log('   - Clear credentials display');
    console.log('   - Security warnings');
    console.log('   - Call-to-action button');
    console.log('   - Next steps guidance');
    
  } catch (error) {
    console.error('❌ Error sending professional welcome email:', error);
  }
}

testProfessionalWelcomeEmail().catch(console.error); 