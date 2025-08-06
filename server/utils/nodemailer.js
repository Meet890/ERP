const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// Create reusable transporter
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Add timeout and other options
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5
});

// Verify transport connection
transport.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server ready to send emails');
  }
});

const sendEmail = async (email, secretToken, mode) => {
  try {
    if (mode === "OTP") {
      const mailOptions = {
        from: `"College ERP" <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject: "Password Reset OTP - College ERP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50; text-align: center;">Password Reset</h1>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
              <p style="font-size: 16px;">Your OTP for password reset is:</p>
              <h2 style="text-align: center; color: #e74c3c; letter-spacing: 5px; padding: 10px;">
                ${secretToken}
              </h2>
              <p style="font-size: 14px; color: #7f8c8d;">
                This OTP will expire in 5 minutes. If you didn't request this, please ignore this email.
              </p>
            </div>
            <p style="text-align: center; margin-top: 20px; color: #95a5a6; font-size: 12px;">
              This is an automated email, please do not reply.
            </p>
          </div>
        `
      };

      const info = await transport.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    }
  } catch (error) {
    console.error('Send email error:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

module.exports = sendEmail;