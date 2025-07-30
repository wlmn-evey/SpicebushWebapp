import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { parentName, email, phone, childAge, preferredTimes, questions, schoolEmail } = data;

    // Validate required fields
    if (!parentName || !email || !phone || !childAge) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create email content
    const emailContent = `
      <h2>New Tour Request</h2>
      <p><strong>Parent/Guardian Name:</strong> ${parentName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Child's Age:</strong> ${childAge}</p>
      ${preferredTimes ? `<p><strong>Preferred Times:</strong> ${preferredTimes}</p>` : ''}
      ${questions ? `<p><strong>Questions/Special Considerations:</strong> ${questions}</p>` : ''}
      <hr>
      <p><em>This tour request was submitted via the website on ${new Date().toLocaleString()}</em></p>
    `;

    // For development, we'll just log the email content
    // In production, you would configure a real email service
    if (import.meta.env.DEV) {
      console.log('Tour Request Email Content:');
      console.log('To:', schoolEmail);
      console.log('Subject: New Tour Request from', parentName);
      console.log('Content:', emailContent);

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Tour request received (development mode - email logged to console)' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Production email configuration
    // You'll need to set up environment variables for your email service
    const transporter = nodemailer.createTransport({
      host: import.meta.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(import.meta.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: import.meta.env.SMTP_USER,
        pass: import.meta.env.SMTP_PASS
      }
    });

    // Send email
    await transporter.sendMail({
      from: import.meta.env.SMTP_FROM || '"Spicebush Website" <noreply@spicebushmontessori.org>',
      to: schoolEmail,
      subject: `New Tour Request from ${parentName}`,
      html: emailContent,
      replyTo: email
    });

    // Send confirmation email to parent
    const confirmationEmail = `
      <h2>Thank you for your interest in Spicebush Montessori School!</h2>
      <p>We've received your tour request and will contact you within 1-2 business days to schedule your visit.</p>
      <p>If you have any immediate questions, please don't hesitate to call us at ${phone}.</p>
      <p>We look forward to meeting you and showing you our wonderful school!</p>
      <hr>
      <p><strong>Your Tour Request Details:</strong></p>
      <p>Child's Age: ${childAge}</p>
      ${preferredTimes ? `<p>Preferred Times: ${preferredTimes}</p>` : ''}
      ${questions ? `<p>Questions: ${questions}</p>` : ''}
    `;

    await transporter.sendMail({
      from: import.meta.env.SMTP_FROM || '"Spicebush Montessori School" <noreply@spicebushmontessori.org>',
      to: email,
      subject: 'Tour Request Confirmation - Spicebush Montessori School',
      html: confirmationEmail
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Tour request submitted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing tour request:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to process tour request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};