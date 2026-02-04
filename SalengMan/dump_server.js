const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const Minio = require('minio');
const fileUpload = require('express-fileupload');

// MinIO config
const MINIO_URL = process.env.MINIO_URL || 'http://localhost:9000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// MinIO Client
const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: process.env.POSTGRES_PASSWORD
});

// Initialize bucket
async function initBucket() {
  const bucketName = 'salengman';
  try {
    const exists = await minioClient.bucketExists(bucketName);

    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log('Bucket created');
    }

    // Always set policy (in case it was reset)
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`]
      }]
    };

    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    console.log('Bucket ready with public policy');

  } catch (err) {
    console.log('Bucket init error:', err.message);
  }
}

initBucket();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* USER SECTION */

// Register user
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, gender } = req.body;

    // Check password provided
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user with password
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, gender)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, gender`,
      [email, password_hash, full_name, phone, role || 'customer', gender]
    );

    const user = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});
// Login user
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check password
    if (user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, gender: user.gender },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Get current user (protected route)
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, phone, role, avatar_url, gender FROM users WHERE id = $1',
      [req.user.user_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload avatar (with old image deletion)
app.post('/upload/avatar', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const file = req.files.image;
    const bucketName = 'salengman';

    // 1. Get current avatar from database
    const userResult = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.user_id]
    );

    const currentAvatar = userResult.rows[0]?.avatar_url;

    // 2. Delete old avatar if exists
    if (currentAvatar) {
      try {
        // Extract file path from URL
        // URL: http://localhost:9000/salengman/avatar/1_123456.jpg
        // Path: avatar/1_123456.jpg
        const oldPath = currentAvatar.split(`${bucketName}/`)[1];

        if (oldPath) {
          await minioClient.removeObject(bucketName, oldPath);
          console.log('Old avatar deleted:', oldPath);
        }
      } catch (err) {
        console.log('Error deleting old avatar:', err.message);
        // Continue even if delete fails
      }
    }

    // 3. Upload new avatar
    const fileName = `avatar/${req.user.user_id}_${Date.now()}.jpg`;

    await minioClient.putObject(bucketName, fileName, file.data, file.size, {
      'Content-Type': file.mimetype
    });

    const imageUrl = `${MINIO_URL}/${bucketName}/${fileName}`;

    // 4. Update database
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [imageUrl, req.user.user_id]
    );

    res.json({ url: imageUrl });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});