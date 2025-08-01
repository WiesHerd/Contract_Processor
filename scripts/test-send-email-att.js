#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';
const TO_EMAIL = 'herdzik@att.net';

async function testSendEmailToAtt() {
  console.log('📧 Testing Email Sending to herdzik@att.net...\n');

  try {
    const client = new SESClient({ region: REGION });
    
    const subject = 'Test Email from Contract Engine (ATT)';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email</h1>
          </div>
          
          <h2>Hello!</h2>
          <p>This is a test email from your Contract Engine application.</p>
          <p>If you receive this, your email configuration is working!</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>To:</strong> ${TO_EMAIL}</p>
          <p><strong>From:</strong> ${FROM_EMAIL}</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This is a test message from Contract Engine. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const textBody = `
      Test Email from Contract Engine
      
      Hello!
      
      This is a test email from your Contract Engine application.
      If you receive this, your email configuration is working!
      
      Time: ${new Date().toISOString()}
      To: ${TO_EMAIL}
      From: ${FROM_EMAIL}
      
      This is a test message from Contract Engine. Please do not reply to this email.
    `;
    
    console.log('📤 Sending test email...');
    
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
    
    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${result.MessageId}`);
    console.log(`📬 Check your email at: ${TO_EMAIL}`);
    console.log('\n💡 IMPORTANT: Check your spam/junk folder if you don\'t see it in your inbox!');
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testSendEmailToAtt().catch(console.error); 