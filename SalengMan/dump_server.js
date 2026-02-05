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

// Initialize Database
async function initDB() {
  try {
    // Create addresses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        label VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        phone VARCHAR(20),
        note TEXT,
        is_default BOOLEAN DEFAULT false,
        province VARCHAR(100),
        district VARCHAR(100),
        sub_district VARCHAR(100),
        zipcode VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database tables ready');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

initBucket();
initDB();

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

/* ADDRESS SECTION */

// Get user addresses
app.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add new address
app.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const { label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode } = req.body;

    // 1. Check limit (max 10)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM addresses WHERE user_id = $1',
      [req.user.user_id]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({ error: 'Maximum 10 addresses allowed' });
    }

    // 2. Handle default address logic
    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.user_id]
      );
    }

    // If first address, force default
    let finalIsDefault = is_default;
    if (parseInt(countResult.rows[0].count) === 0) {
      finalIsDefault = true;
    }

    const result = await pool.query(
      `INSERT INTO addresses 
       (user_id, label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.user_id, label, address, lat, lng, phone, note, finalIsDefault, province, district, sub_district, zipcode]
    );

    // Sync with users table default_address
    if (finalIsDefault) {
      try {
        await pool.query(
          'UPDATE users SET default_address = $1 WHERE id = $2',
          [address, req.user.user_id]
        );
      } catch (syncError) {
        console.error('Failed to sync default_address:', syncError.message);
        // Do not fail the request if this minor part fails
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Set default address
app.patch('/addresses/:id/default', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;

    // 1. Verify ownership
    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // 2. Unset all others
    await pool.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [req.user.user_id]
    );

    // 3. Set new default
    const result = await pool.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 RETURNING *',
      [addressId]
    );

    // 4. Sync with users table
    try {
      await pool.query(
        'UPDATE users SET default_address = $1 WHERE id = $2',
        [result.rows[0].address, req.user.user_id]
      );
    } catch (syncError) {
      console.error('Failed to sync default_address:', syncError.message);
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



// Get single address
app.get('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update address
app.put('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const { label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode } = req.body;
    const addressId = req.params.id;

    // Check ownership
    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Handle default logic
    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.user_id]
      );
    } else {
      // Check if this is the ONLY address. If so, it MUST be default.
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM addresses WHERE user_id = $1',
        [req.user.user_id]
      );
      if (parseInt(countResult.rows[0].count) <= 1) {
        // If we are updating the only address, it has to be default
        is_default = true;
      }
    }

    const result = await pool.query(
      `UPDATE addresses SET
       label = $1, address = $2, lat = $3, lng = $4, phone = $5, note = $6, is_default = $7, province = $8, district = $9, sub_district = $10, zipcode = $11
       WHERE id = $12 RETURNING *`,
      [label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode, addressId]
    );

    // Sync user default address if set to true
    if (is_default) {
      try {
        await pool.query(
          'UPDATE users SET default_address = $1 WHERE id = $2',
          [address, req.user.user_id]
        );
      } catch (err) { console.error('Sync error', err); }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete specific address
app.delete('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;

    // Check ownership
    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Delete address
    await pool.query('DELETE FROM addresses WHERE id = $1', [addressId]);

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user account
app.delete('/auth/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Delete addresses
    await pool.query('DELETE FROM addresses WHERE user_id = $1', [userId]);

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});