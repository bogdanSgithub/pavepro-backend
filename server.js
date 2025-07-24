const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,  // Disable X-RateLimit headers
});

app.use(cors({
  origin: process.env.FRONTEND_HOST,
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
}));

// Use multer for file handling (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Parse JSON bodies
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const cpUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'attachments', maxCount: 10 },
]);

app.get('/up', (req, res) => {
  res.send('hello world');
});

app.post('/email', emailLimiter, cpUpload, async (req, res) => {
  if (req.body.middleName && req.body.middleName.trim() !== '') {
    return res.status(400).json({ error: 'Bot detected.' });
  }
  
  const origin = req.get('origin') || '';
  const referer = req.get('referer') || '';

  const isValidOrigin = origin.startsWith(process.env.FRONTEND_HOST)
    || referer.startsWith(process.env.FRONTEND_HOST);

  if (!isValidOrigin) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const {
    firstName = '',
    lastName = '',
    email = '',
    phone = '',
    address = '',
    message = '',
  } = req.body;

  if (!firstName || !lastName || !email || !phone || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const files = [
    ...(req.files?.images || []),
    ...(req.files?.attachments || []),
  ];

  const attachments = files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype,
  }));

  const subject = `Quote Request from ${firstName} ${lastName}`;
  const text = `
    Name: ${firstName} ${lastName}
    Email: ${email}
    Phone: ${phone}
    Address: ${address || 'N/A'}

    Message:
    ${message}
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject,
      text,
      attachments,
    });

    res.json({ message: 'Email sent successfully!' });
    console.log("sent email")
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
