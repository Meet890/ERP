const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const randomatic = require('randomatic');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error registering user.' });
  }
});

// LOGIN – Send OTP
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const otp = randomatic('0', 6); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ message: 'OTP sent to email', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
});

// VERIFY OTP
// VERIFY OTP + Return JWT
router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const expired = new Date() > user.otpExpiry;
    if (expired || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP fields
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Create JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'OTP verified successfully',
      token
    });

  } catch (err) {
    res.status(500).json({ error: 'OTP verification error' });
  }
});



function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // add user info to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}


module.exports = router;
