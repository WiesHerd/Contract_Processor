#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = 'us-east-2';
const FROM_EMAIL = 'wherdzik@gmail.com';
const TO_EMAIL = 'wherdzik@gmail.com';

async function testBrowserEmailSimulation() {
  console.log('🔍 Testing Browser Email Simulation...\n');

  try {
    // Simulate what happens in the browser
    console.log('📧 Testing with default credentials (like browser would use)...');
    
    const client = new SESClient({ region: REGION });
    
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [TO_EMAIL],
      },
      Message: {
        Subject: {
          Data: 'Test Browser Email - Contract Engine',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <h2>Browser Email Test</h2>
              <p>This simulates what happens when the app tries to send emails.</p>
              <p>If this works, the issue is in the browser authentication.</p>
              <p>Time: ${new Date().toISOString()}</p>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
              Browser Email Test
              
              This simulates what happens when the app tries to send emails.
              If this works, the issue is in the browser authentication.
              
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
    console.log('\n💡 This means SES is working. The issue might be:');
    console.log('   1. Browser authentication not working');
    console.log('   2. Session credentials not available');
    console.log('   3. CORS issues with SES in browser');
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    if (error.name === 'MessageRejected') {
      console.log('\n🔧 This usually means:');
      console.log('   1. The FROM email is not verified in SES');
      console.log('   2. The TO email is not verified (in sandbox mode)');
      console.log('   3. You need to verify both emails in AWS SES Console');
    } else if (error.name === 'AccessDeniedException') {
      console.log('\n🔧 This suggests authentication issues:');
      console.log('   1. Browser credentials not working');
      console.log('   2. Need to use session credentials');
      console.log('   3. CORS policy blocking SES calls');
    }
  }
}

testBrowserEmailSimulation().catch(console.error); 