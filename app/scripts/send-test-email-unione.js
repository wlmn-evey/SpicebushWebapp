import 'dotenv/config';
import { EmailService } from '../src/lib/email-service.ts';

async function sendTestEmail() {
  console.log('📧 Sending test email via Unione.io...\n');
  
  // Check if Unione.io is configured
  if (!process.env.UNIONE_API_KEY) {
    console.error('❌ UNIONE_API_KEY not found in environment variables');
    console.log('\nPlease add to .env.local:');
    console.log('UNIONE_API_KEY=your-api-key-here');
    console.log('UNIONE_REGION=eu (or us)');
    return;
  }
  
  // Initialize email service
  const emailService = new EmailService();
  
  // Test email data
  const testEmail = {
    to: 'evey@eveywinters.com',
    from: process.env.EMAIL_FROM || 'noreply@spicebushmontessori.org',
    fromName: process.env.EMAIL_FROM_NAME || 'Spicebush Montessori School',
    subject: 'Test Email from Spicebush Website',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5530;">Test Email from Spicebush Montessori</h2>
        
        <p>Hi Evey,</p>
        
        <p>This is a test email sent via Unione.io from the Spicebush Montessori website.</p>
        
        <p><strong>Email Service Status:</strong></p>
        <ul>
          <li>✅ Unione.io integration is working</li>
          <li>✅ Email delivery is functional</li>
          <li>✅ Ready for magic link emails</li>
        </ul>
        
        <p>Timestamp: ${new Date().toLocaleString()}</p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        
        <p style="color: #666; font-size: 14px;">
          This is an automated test email from the Spicebush Montessori website.
          If you received this, the email service is working correctly.
        </p>
      </div>
    `,
    text: `Test Email from Spicebush Montessori

Hi Evey,

This is a test email sent via Unione.io from the Spicebush Montessori website.

Email Service Status:
- Unione.io integration is working
- Email delivery is functional
- Ready for magic link emails

Timestamp: ${new Date().toLocaleString()}

This is an automated test email from the Spicebush Montessori website.
If you received this, the email service is working correctly.`
  };
  
  try {
    console.log('📤 Sending to:', testEmail.to);
    console.log('📬 From:', testEmail.from);
    console.log('📝 Subject:', testEmail.subject);
    console.log('');
    
    const result = await emailService.send(testEmail);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('\nCheck your inbox at evey@eveywinters.com');
    } else {
      console.error('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
sendTestEmail();