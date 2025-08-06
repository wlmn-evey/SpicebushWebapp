import 'dotenv/config';
import fetch from 'node-fetch';

async function sendTestEmailDirect() {
  console.log('📧 Sending test email via Unione.io API...\n');
  
  const apiKey = process.env.UNIONE_API_KEY || '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme';
  // Force reload of environment
  const region = 'us'; // Try US region
  const apiUrl = `https://${region}1.unione.io/en/transactional/api/v1/email/send.json`;
  
  const emailData = {
    message: {
      from_email: 'noreply@spicebushmontessori.org',
      from_name: 'Spicebush Montessori School',
      subject: 'Test Email from Spicebush Website',
      body: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5530;">Test Email from Spicebush Montessori</h2>
            
            <p>Hi Evey,</p>
            
            <p>This is a test email sent via Unione.io from the Spicebush Montessori website.</p>
            
            <p><strong>Email Service Status:</strong></p>
            <ul>
              <li>✅ Unione.io API is working</li>
              <li>✅ Email delivery is functional</li>
              <li>✅ Ready for magic link emails</li>
            </ul>
            
            <p><strong>Technical Details:</strong></p>
            <ul>
              <li>API Region: ${region}</li>
              <li>From Domain: spicebushmontessori.org</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
            </ul>
            
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            
            <p style="color: #666; font-size: 14px;">
              This is an automated test email. If you received this, the Unione.io integration is working correctly!
            </p>
          </div>
        `,
        plaintext: `Test Email from Spicebush Montessori

Hi Evey,

This is a test email sent via Unione.io from the Spicebush Montessori website.

Email Service Status:
- Unione.io API is working
- Email delivery is functional
- Ready for magic link emails

Technical Details:
- API Region: ${region}
- From Domain: spicebushmontessori.org
- Timestamp: ${new Date().toISOString()}

This is an automated test email. If you received this, the Unione.io integration is working correctly!`
      },
      recipients: [
        {
          email: 'information@spicebushmontessori.org',
          substitutions: {}
        }
      ]
    }
  };
  
  console.log('📤 Sending to: information@spicebushmontessori.org');
  console.log('📬 From: noreply@spicebushmontessori.org');
  console.log('🌍 API Region: ' + region);
  console.log('🔗 API URL: ' + apiUrl);
  console.log('');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(emailData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      console.log('✅ Email sent successfully!');
      console.log('📧 Job ID:', result.job_id);
      console.log('✉️  Email status:', result.status);
      console.log('\n📬 Check your inbox at information@spicebushmontessori.org');
    } else {
      console.error('❌ Failed to send email');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
sendTestEmailDirect();