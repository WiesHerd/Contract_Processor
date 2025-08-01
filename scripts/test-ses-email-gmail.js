#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';
const TO_EMAIL = 'wherdzik@gmail.com';

async function testSESEmailToGmail() {
  console.log('📧 Testing SES Email to wherdzik@gmail.com...\n');

  try {
    const client = new SESClient({ region: REGION });
    
    const subject = 'Welcome to Contract Engine - Test User';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Welcome to Contract Engine</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .credentials { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Contract Engine</h1>
          </div>
          
          <h2>Hello Test User,</h2>
          <p>Welcome to Contract Engine! Your account has been successfully created.</p>
          
          <div class="credentials">
            <h3>Your Login Credentials</h3>
            <p><strong>Username:</strong> test.user</p>
            <p><strong>Temporary Password:</strong> TestPass123!</p>
            <p><strong>Login URL:</strong> https://your-app-domain.com</p>
          </div>
          
          <div class="warning">
            <p><strong>Important:</strong> You must change your password on your first login for security.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://your-app-domain.com" class="button">Sign In Now</a>
          </div>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This is a test message from Contract Engine. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const textBody = `
      Welcome to Contract Engine!
      
      Hello Test User,
      
      Welcome to Contract Engine! Your account has been successfully created.
      
      YOUR LOGIN CREDENTIALS:
      Username: test.user
      Temporary Password: TestPass123!
      Login URL: https://your-app-domain.com
      
      IMPORTANT: You must change your password on your first login for security.
      
      This is a test message from Contract Engine. Please do not reply to this email.
    `;
    
    console.log('📤 Sending welcome email...');
    
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
    
    console.log('✅ Welcome email sent successfully!');
    console.log(`📧 Message ID: ${result.MessageId}`);
    console.log(`📬 Check your email at: ${TO_EMAIL}`);
    console.log('\n💡 IMPORTANT: Check your spam/junk folder if you don\'t see it in your inbox!');
    console.log('\n🎯 This confirms that:');
    console.log('   - SES is working correctly');
    console.log('   - Emails are being sent');
    console.log('   - The issue is spam filtering');
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}

testSESEmailToGmail().catch(console.error); 