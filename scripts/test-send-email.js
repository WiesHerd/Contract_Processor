#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';
const TO_EMAIL = 'wherdzik@gmail.com'; // Send to yourself for testing

async function testSendEmail() {
  console.log('📧 Testing Email Sending...\n');

  try {
    const client = new SESClient({ region: REGION });
    
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [TO_EMAIL],
      },
      Message: {
        Subject: {
          Data: 'Test Email from Contract Engine',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <h2>Test Email</h2>
              <p>This is a test email from your Contract Engine application.</p>
              <p>If you receive this, your email configuration is working!</p>
              <p>Time: ${new Date().toISOString()}</p>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
              Test Email
              
              This is a test email from your Contract Engine application.
              If you receive this, your email configuration is working!
              
              Time: ${new Date().toISOString()}
            `,
            Charset: 'UTF-8',
          },
        },
      },
    });

    console.log('📤 Sending test email...');
    const result = await client.send(command);
    
    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${result.MessageId}`);
    console.log(`📬 Check your email at: ${TO_EMAIL}`);
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    if (error.name === 'MessageRejected') {
      console.log('\n🔧 This usually means:');
      console.log('   1. The FROM email is not verified in SES');
      console.log('   2. The TO email is not verified (in sandbox mode)');
      console.log('   3. You need to verify both emails in AWS SES Console');
    }
  }
}

testSendEmail().catch(console.error); 