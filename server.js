const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', // React dev server
  credentials: true,
}));

// Use multer for file handling (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Parse JSON bodies
app.use(express.json());

// POST route to send an email with optional image attachments
app.post('/email', upload.array('images'), async (req, res) => {
  const { to, subject, text } = req.body;
  const files = req.files || [];

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Configure nodemailer transport (example with Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Convert files into nodemailer attachments
  const attachments = files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype,
  }));

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // sender address
      to: process.env.EMAIL_USER,
      subject: `${to} ${subject}`,
      text,
      attachments,
    });

    res.json({ message: 'Email sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
