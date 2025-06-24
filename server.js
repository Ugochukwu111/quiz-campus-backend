// Load environment variables from the .env file into process.env
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();

// === Setup Nodemailer Transporter ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ 1. Setup CORS FIRST — before anything else
app.use(cors({
   origin: ['https://quiz-campus.vercel.app'],
  credentials: true
}));




// === Middleware === //
app.use(express.json()); // Parse incoming JSON bodies

// === MongoDB Connection === //
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected');

  // Start the server only after DB connects
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});


// === User Schema & Model === //
const quizCampusSignupSchema = new mongoose.Schema({
  fullname: String,
  email: { type: String, unique: true },
  password: String,
  school: String,
  resetToken: String,
  resetTokenExpires : Date,
});
const quizcampus = mongoose.model("quizcampus", quizCampusSignupSchema);


// === SIGNUP ROUTE === //
app.post("/signup", async function (req, res) {
  try {
    const { fullname, email, password, confirmPassword, school } = req.body;

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // 2. Check if email is already in use
    const existingUser = await quizcampus.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 3. Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create and save new user
    const newUser = new quizcampus({
      fullname,
      email,
      password: hashedPassword,
      school,
    });

    await newUser.save();

    // 5. Respond with success message
    res.status(201).json({ message: "Signup successful" });

  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});


// SIGN IN ROUTE
// === LOGIN ROUTE === //
app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await quizcampus.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 2. Compare password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    // 4. Respond with token and user info (optional)
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        fullname: user.fullname,
        email: user.email,
        school: user.school
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});



// === FORGOT PASSWORD ROUTE === //
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // 2. Find the user
    const user = await quizcampus.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with that email not found' });
    }

    // 3. Generate reset token (for now we mock it)
   const resetToken = crypto.randomBytes(32).toString('hex');
       // 4. Save the token and expiration to DB
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 1000 * 60 * 60; // Token valid for 1 hour

    await user.save();

    // 4. Respond with token for now (no email sending yet)
   // res.status(200).json({ message: 'Reset token generated', resetToken });
     // 4. Build reset link
    const resetLink = `http://127.0.0.1:5501/reset-password.html?token=${resetToken}`;

    // 5. Send email using Nodemailer
    await transporter.sendMail({
      from: `"Quiz Campus" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset Your Quiz Campus Password',
      html: `
        <p>Hello <strong>${user.fullname}</strong>,</p>
        <p>You requested to reset your password.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${resetLink}" style="color:#1e88e5;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <br>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `
    });
res.status(200).json({ message: 'Password reset link sent to email' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});



// === RESET PASSWORD ROUTE === //
app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 1. Find user by token and check if token is still valid
    const user = await quizcampus.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Save new password and clear resetToken fields
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
