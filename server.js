// Load environment variables from the .env file into process.env
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

// === CORS Configuration === //
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
   "https://quiz-campus.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed from this origin: " + origin));
    }
  }
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
