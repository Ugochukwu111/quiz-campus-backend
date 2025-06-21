// Load environment variables from the .env file into process.env
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Middleware to parse incoming JSON request bodies
// This allows us to access req.body when users send data (e.g. during signup)
app.use(express.json());


const cors = require('cors');
app.use(cors({
  origin: 'https://your-frontend.vercel.app', // your Vercel site
  credentials: true // optional, for cookies or auth headers
}));



// Connect to MongoDB using the MONGO_URI from the .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,          // Uses the new MongoDB connection string parser
  useUnifiedTopology: true        // Uses the new Server Discovery and Monitoring engine
})
.then(() => {
  // This code runs if the DB connection is successful
  console.log('✅ MongoDB Connected');

  // Start the Express server and listen on the port defined in the .env file
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
})
.catch(err => 
  // This code runs if there's an error connecting to MongoDB
  console.error('MongoDB connection error:', err)
);


// MONOGODB USER SCHEMA
// Create Mongoose schema and model
const quizCampusSignupSchema = new mongoose.Schema({
  fullname: String,
  email: { type: String, unique: true },
  password: String,
  school: String,
});
const quizcampus = mongoose.model("quizcampus", quizCampusSignupSchema);


// Sign up route 
app.post("/signup", async function (req, res) {
  try {
    const { fullname, email, password, confirmPassword, school } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const existingUser = await QuizCampus.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new QuizCampus({
      fullname,
      email,
      password: hashedPassword,
      school,
    });

    await newUser.save();

    res.status(201).json({ message: "Signup successful" });

  } catch (err) {
    console.error("Error saving user:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
