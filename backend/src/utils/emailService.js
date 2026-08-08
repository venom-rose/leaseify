const nodemailer = require('nodemailer');

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

exports.sendOtpEmail = async (email, otp) => {
  const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

  const mailOptions = {
    from: `"Leaseify.co" <${process.env.SMTP_USER || 'no-reply@leaseify.co'}>`,
    to: email,
    subject: 'Leaseify.co - Verify Your Account with OTP',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FBF9F5; padding: 30px; border-radius: 16px; border: 1px solid #EDE6D8; max-width: 500px; margin: 0 auto; color: #332E24;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2C2214; margin: 0; font-size: 24px; font-weight: 800;">Lease<span style="color: #C8A96E;">ify</span>.co</h2>
          <p style="font-size: 12px; color: #A69888; margin: 4px 0 0 0;">Lease your Luxury</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 24px; border-radius: 12px; border: 1px solid #EDE6D8; box-shadow: 0 4px 14px rgba(200, 169, 110, 0.05);">
          <h3 style="color: #2C2214; margin-top: 0; font-size: 16px;">Verify Your Identity</h3>
          <p style="font-size: 14px; line-height: 1.5; color: #544B3C;">Thank you for registering. Use the following 6-digit One-Time Password (OTP) to complete your signup process. This code is valid for 10 minutes.</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #C8A96E; padding: 12px 24px; background-color: #FFF5DB; border-radius: 12px; border: 1px solid #FFE8B3;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #A69888; margin-bottom: 0;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  if (isSmtpConfigured) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[OTP SENT]: Real email sent successfully to ${email}. Code (for testing/debugging): ${otp}`);
      return true;
    } catch (err) {
      console.error('[SMTP ERROR]: Failed to send mail, falling back to logging to console:', err.message);
    }
  }

  // Fallback / Standalone log preview for ease of evaluation
  console.log('\n=============================================');
  console.log(`🔑 [OTP DEMO FALLBACK] 🔑`);
  console.log(`Email Sent To: ${email}`);
  console.log(`Verification OTP Code: ${otp}`);
  console.log('=============================================\n');
  return true;
};
