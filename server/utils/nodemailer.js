const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (email, secretToken, mode) => {
  try {
    if (mode === "OTP") {
      return await transport.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: "College ERP OTP",
        html: `
        <h1>Reset Password</h1>
        <p> Here is your OTP to change the password: <strong>${secretToken}</strong> </p>
      `,
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports = sendEmail;
