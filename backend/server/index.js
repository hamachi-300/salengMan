const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Minio = require('minio');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// MinIO Client (Docker-aware configuration)
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY
});

// Public URL for MinIO (external access)
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
const BUCKET_NAME = 'salengman';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(fileUpload());

// Initialize bucket
async function initBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log('Bucket created:', BUCKET_NAME);
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
      }]
    };

    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    console.log('Bucket ready with public policy');
  } catch (err) {
    console.log('Bucket init error:', err.message);
  }
}

// Wait for database connection
async function waitForDatabase() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');
      return true;
    } catch (err) {
      console.log(`Waiting for database... (${retries} retries left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Could not connect to database');
}

// Auth middleware
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

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      services: {
        database: 'connected',
        minio: MINIO_PUBLIC_URL,
        postgrest: process.env.POSTGREST_URL || 'http://localhost:3001',
        realtime: process.env.REALTIME_URL || 'http://localhost:4000'
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, gender } = req.body;
    const userRole = role || 'customer';

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (full_name && full_name.length >= 10) {
      return res.status(400).json({ error: 'Username must be less than 10 characters' });
    }

    // Check if user with same email AND same role already exists
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE email = $1 AND role = $2',
      [email, userRole]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: `User with this email already exists as ${userRole}` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, gender)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, gender`,
      [email, password_hash, full_name, phone, userRole, gender]
    );

    const user = result.rows[0];
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

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let result;
    if (role) {
      // If role is specified, find user with that email AND role
      result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, role]
      );
    } else {
      // If no role specified, find all users with that email
      result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // If multiple accounts exist with same email, require role specification
    if (result.rows.length > 1) {
      const roles = result.rows.map(u => u.role);
      return res.status(400).json({
        error: 'Multiple accounts found with this email. Please specify role.',
        available_roles: roles
      });
    }

    const user = result.rows[0];

    if (user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, gender: user.gender, coin: user.coin },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Get current user
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, phone, role, avatar_url, gender, coin FROM users WHERE id = $1',
      [req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update current user profile
app.patch('/auth/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, gender, default_address } = req.body;
    const userId = req.user.user_id;

    if (full_name && full_name.length >= 10) {
      return res.status(400).json({ error: 'Username must be less than 10 characters' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(gender);
    }
    if (default_address !== undefined) {
      updates.push(`default_address = $${paramIndex++}`);
      values.push(default_address);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, email, full_name, phone, role, avatar_url, gender, coin, default_address`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user public profile
app.get('/users/:id/public', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
app.delete('/auth/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get and delete avatar
    const userResult = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    const avatarUrl = userResult.rows[0]?.avatar_url;

    if (avatarUrl) {
      try {
        const objectName = avatarUrl.split(`${BUCKET_NAME}/`)[1];
        if (objectName) {
          await minioClient.removeObject(BUCKET_NAME, objectName);
        }
      } catch (err) {
        console.error('Failed to delete avatar:', err);
      }
    }

    await pool.query('DELETE FROM addresses WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// AVATAR UPLOAD
// ============================================
app.post('/upload/avatar', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const file = req.files.image;

    // Delete old avatar
    const userResult = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.user_id]
    );
    const currentAvatar = userResult.rows[0]?.avatar_url;

    if (currentAvatar) {
      try {
        const oldPath = currentAvatar.split(`${BUCKET_NAME}/`)[1];
        if (oldPath) {
          await minioClient.removeObject(BUCKET_NAME, oldPath);
        }
      } catch (err) {
        console.log('Error deleting old avatar:', err.message);
      }
    }

    // Upload new avatar
    const fileName = `avatar/${req.user.user_id}_${Date.now()}.jpg`;
    await minioClient.putObject(BUCKET_NAME, fileName, file.data, file.size, {
      'Content-Type': file.mimetype
    });

    const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;

    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [imageUrl, req.user.user_id]
    );

    res.json({ url: imageUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// ADDRESS ENDPOINTS
// ============================================

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

app.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const { label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode } = req.body;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM addresses WHERE user_id = $1',
      [req.user.user_id]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({ error: 'Maximum 10 addresses allowed' });
    }

    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.user_id]
      );
    }

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

    if (finalIsDefault) {
      await pool.query(
        'UPDATE users SET default_address = $1 WHERE id = $2',
        [address, req.user.user_id]
      ).catch(err => console.error('Sync error:', err.message));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

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

app.put('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    let { label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode } = req.body;
    const addressId = req.params.id;

    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.user_id]
      );
    }

    const result = await pool.query(
      `UPDATE addresses SET
       label = $1, address = $2, lat = $3, lng = $4, phone = $5, note = $6, is_default = $7,
       province = $8, district = $9, sub_district = $10, zipcode = $11
       WHERE id = $12 RETURNING *`,
      [label, address, lat, lng, phone, note, is_default, province, district, sub_district, zipcode, addressId]
    );

    if (is_default) {
      await pool.query(
        'UPDATE users SET default_address = $1 WHERE id = $2',
        [address, req.user.user_id]
      ).catch(err => console.error('Sync error:', err.message));
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/addresses/:id/default', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;

    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await pool.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [req.user.user_id]
    );

    const result = await pool.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 RETURNING *',
      [addressId]
    );

    await pool.query(
      'UPDATE users SET default_address = $1 WHERE id = $2',
      [result.rows[0].address, req.user.user_id]
    ).catch(err => console.error('Sync error:', err.message));

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;

    const check = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await pool.query('DELETE FROM addresses WHERE id = $1', [addressId]);
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// OLD ITEM POSTS ENDPOINTS
// ============================================

// Get user's own posts
app.get('/old-item-posts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM old_item_posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all available posts (for drivers) - waiting status only, exclude already contacted
app.get('/old-item-posts/available/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can view available posts' });
    }

    const driverId = req.user.user_id;

    const result = await pool.query(
      `SELECT oip.*, u.id as seller_id, u.full_name as seller_name, u.phone as seller_phone, u.avatar_url as seller_avatar
       FROM old_item_posts oip
       JOIN users u ON oip.user_id = u.id
       WHERE oip.status = 'waiting'
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(oip.contacts, '[]'::JSONB)) elem
           WHERE elem->>'driver_id' = $1
         )
       ORDER BY oip.created_at DESC`,
      [driverId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/old-item-posts/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM old_item_posts WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/old-item-posts', authMiddleware, async (req, res) => {
  try {
    const { images, categories, remarks, address, pickupTime } = req.body;
    const uploadedImageUrls = [];

    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i];
        const base64Image = base64Data.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `old_item_posts/${req.user.user_id}_${Date.now()}_${i}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
        uploadedImageUrls.push(imageUrl);
      }
    }

    const result = await pool.query(
      `INSERT INTO old_item_posts
       (user_id, images, categories, remarks, address_snapshot, pickup_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.user_id,
        uploadedImageUrls,
        categories,
        remarks,
        JSON.stringify(address),
        JSON.stringify(pickupTime),
        'waiting'
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update old item post
app.put('/old-item-posts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { images, categories, remarks, address, pickupTime } = req.body;

    // Check if post exists and belongs to user
    const check = await pool.query(
      'SELECT * FROM old_item_posts WHERE id = $1 AND user_id = $2',
      [id, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    const post = check.rows[0];

    // Only allow editing if status is waiting or pending
    if (post.status !== 'waiting' && post.status !== 'pending') {
      return res.status(400).json({ error: 'Only waiting/pending posts can be edited' });
    }

    // Handle images - separate new base64 images from existing URLs
    const uploadedImageUrls = [];

    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        // Check if it's a base64 image (new upload) or existing URL
        if (img.startsWith('data:')) {
          // New image - upload to MinIO
          const base64Image = img.split(';base64,').pop();
          const buffer = Buffer.from(base64Image, 'base64');
          const fileName = `old_item_posts/${req.user.user_id}_${Date.now()}_${i}.jpg`;

          await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
            'Content-Type': 'image/jpeg'
          });

          const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
          uploadedImageUrls.push(imageUrl);
        } else {
          // Existing image URL - keep it
          uploadedImageUrls.push(img);
        }
      }
    }

    // Delete old images that are no longer in the list
    if (post.images && post.images.length > 0) {
      for (const oldImg of post.images) {
        if (!uploadedImageUrls.includes(oldImg)) {
          try {
            const objectName = oldImg.split(`${BUCKET_NAME}/`)[1];
            if (objectName) {
              await minioClient.removeObject(BUCKET_NAME, objectName);
            }
          } catch (err) {
            console.error('Failed to delete old image:', err);
          }
        }
      }
    }

    // Update the post
    const result = await pool.query(
      `UPDATE old_item_posts
       SET images = $1,
           categories = $2,
           remarks = $3,
           address_snapshot = $4,
           pickup_time = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        uploadedImageUrls,
        categories,
        remarks,
        JSON.stringify(address),
        JSON.stringify(pickupTime),
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/old-item-posts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      'SELECT * FROM old_item_posts WHERE id = $1 AND user_id = $2',
      [id, req.user.user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    const post = check.rows[0];

    if (post.status !== 'waiting' && post.status !== 'pending') {
      return res.status(400).json({ error: 'Only waiting/pending posts can be deleted' });
    }

    // Delete images from MinIO
    if (post.images && post.images.length > 0) {
      for (const imgUrl of post.images) {
        try {
          const objectName = imgUrl.split(`${BUCKET_NAME}/`)[1];
          if (objectName) {
            await minioClient.removeObject(BUCKET_NAME, objectName);
          }
        } catch (err) {
          console.error('Failed to delete image:', err);
        }
      }
    }

    await pool.query('DELETE FROM old_item_posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// DRIVER LOCATION ENDPOINTS
// ============================================

app.post('/driver/location', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update location' });
    }

    const { lat, lng, heading, speed } = req.body;

    const result = await pool.query(
      `INSERT INTO driver_locations (driver_id, lat, lng, heading, speed, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (driver_id)
       DO UPDATE SET lat = $2, lng = $3, heading = $4, speed = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.user_id, lat, lng, heading, speed]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/driver/location/:driverId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM driver_locations WHERE driver_id = $1',
      [req.params.driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get nearby drivers (using PostGIS)
app.get('/drivers/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters

    const result = await pool.query(
      `SELECT dl.*, u.full_name, u.phone, u.avatar_url,
              ST_Distance(
                ST_SetSRID(ST_MakePoint(dl.lng, dl.lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) as distance
       FROM driver_locations dl
       JOIN users u ON dl.driver_id = u.id
       WHERE ST_DWithin(
         ST_SetSRID(ST_MakePoint(dl.lng, dl.lat), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
       ORDER BY distance`,
      [lat, lng, radius]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// COIN ENDPOINTS
// ============================================

// Get coin history
app.get('/coins/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM coin_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get coin balance
const getCoinBalance = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT coin FROM users WHERE id = $1',
      [req.user.user_id]
    );
    res.json({ balance: result.rows[0]?.coin || 0 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

app.get('/coins/balance', authMiddleware, getCoinBalance);
app.get('/api/coins/balance', authMiddleware, getCoinBalance);

// Buy coins
app.post('/coins/buy', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await client.query('BEGIN');

    // Update user balance
    const userUpdate = await client.query(
      'UPDATE users SET coin = coin + $1 WHERE id = $2 RETURNING coin',
      [amount, req.user.user_id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type)
       VALUES ($1, $2, 'buy')`,
      [req.user.user_id, amount]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Coins purchased successfully',
      newBalance: userUpdate.rows[0].coin
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Use coins
app.post('/coins/use', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await client.query('BEGIN');

    // Check balance
    const userCheck = await client.query(
      'SELECT coin FROM users WHERE id = $1 FOR UPDATE',
      [req.user.user_id]
    );

    const currentBalance = userCheck.rows[0].coin || 0;

    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    // Deduct coins
    const userUpdate = await client.query(
      'UPDATE users SET coin = coin - $1 WHERE id = $2 RETURNING coin',
      [amount, req.user.user_id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO coin_transactions (user_id, amount, type)
       VALUES ($1, $2, 'use')`,
      [req.user.user_id, amount]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Coins used successfully',
      newBalance: userUpdate.rows[0].coin
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// ORDER ENDPOINTS
// ============================================

app.get('/orders', authMiddleware, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'driver') {
      query = 'SELECT * FROM orders WHERE driver_id = $1 ORDER BY created_at DESC';
      params = [req.user.user_id];
    } else {
      query = 'SELECT * FROM orders WHERE seller_id = $1 ORDER BY created_at DESC';
      params = [req.user.user_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (driver_id = $3 OR seller_id = $3)
       RETURNING *`,
      [status, orderId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// CONTACTS ENDPOINTS
// ============================================

// Create contact (driver initiates contact with seller)
app.post('/contacts', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can create contacts' });
    }

    const { post_ids } = req.body; // Array of post IDs

    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
      return res.status(400).json({ error: 'post_ids array is required' });
    }

    const createdContacts = [];

    // Ensure 'type' column exists (Migration)
    await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'contacts' AND column_name = 'type'
          ) THEN
              ALTER TABLE contacts ADD COLUMN type VARCHAR(50);
          END IF;
      END $$;
    `).catch(err => console.error('Migration error:', err.message));

    for (const postId of post_ids) {
      // Get post details to find seller
      const postResult = await pool.query(
        'SELECT * FROM old_item_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        continue; // Skip if post not found
      }

      const post = postResult.rows[0];
      const sellerId = post.user_id;

      // Check if contact already exists for this post and buyer
      const existingContact = await pool.query(
        'SELECT * FROM contacts WHERE post_id = $1 AND buyer_id = $2',
        [postId, req.user.user_id]
      );

      if (existingContact.rows.length > 0) {
        createdContacts.push(existingContact.rows[0]);
        continue; // Skip if contact already exists
      }

      // Create chat first
      const chatResult = await pool.query(
        `INSERT INTO chats (messages) VALUES ('[]'::JSONB) RETURNING *`
      );
      const chatId = chatResult.rows[0].id;

      // Create contact
      const contactResult = await pool.query(
        `INSERT INTO contacts (post_id, seller_id, buyer_id, chat_id, status, type)
         VALUES ($1, $2, $3, $4, 'pending', 'old_item_posts')
         RETURNING *`,
        [postId, sellerId, req.user.user_id, chatId]
      );

      const contact = contactResult.rows[0];

      // Update old_item_posts with contact info
      await pool.query(
        `UPDATE old_item_posts
         SET contacts = COALESCE(contacts, '[]'::JSONB) || $1::JSONB,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify([{ contact_id: contact.id, driver_id: req.user.user_id }]), postId]
      );

      createdContacts.push(contact);
    }

    res.json(createdContacts);
  } catch (error) {
    console.error('Error creating contacts:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get contacts for current user (both seller and driver)
app.get('/contacts', authMiddleware, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'driver') {
      // Driver sees contacts where they are the buyer
      query = `
        SELECT c.*,
               oip.images, oip.categories, oip.remarks, oip.status as post_status, oip.address_snapshot,
               u.full_name as seller_name, u.phone as seller_phone, u.avatar_url as seller_avatar
        FROM contacts c
        JOIN old_item_posts oip ON c.post_id = oip.id
        JOIN users u ON c.seller_id = u.id
        WHERE c.buyer_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.user_id];
    } else {
      // Seller sees contacts where they are the seller
      query = `
        SELECT c.*,
               oip.images, oip.categories, oip.remarks, oip.status as post_status, oip.address_snapshot,
               u.full_name as buyer_name, u.phone as buyer_phone, u.avatar_url as buyer_avatar
        FROM contacts c
        JOIN old_item_posts oip ON c.post_id = oip.id
        JOIN users u ON c.buyer_id = u.id
        WHERE c.seller_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.user_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single contact by ID
app.get('/contacts/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              oip.images, oip.categories, oip.remarks, oip.status as post_status, oip.address_snapshot,
              seller.full_name as seller_name, seller.phone as seller_phone, seller.avatar_url as seller_avatar,
              buyer.full_name as buyer_name, buyer.phone as buyer_phone, buyer.avatar_url as buyer_avatar
       FROM contacts c
       JOIN old_item_posts oip ON c.post_id = oip.id
       JOIN users seller ON c.seller_id = seller.id
       JOIN users buyer ON c.buyer_id = buyer.id
       WHERE c.id = $1 AND (c.seller_id = $2 OR c.buyer_id = $2)`,
      [req.params.id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update contact status
app.patch('/contacts/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const contactId = req.params.id;

    const result = await pool.query(
      `UPDATE contacts SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (seller_id = $3 OR buyer_id = $3)
       RETURNING *`,
      [status, contactId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel contact
app.delete('/contacts/:id', authMiddleware, async (req, res) => {
  try {
    const contactId = req.params.id;
    const userId = req.user.user_id;

    // Fetch contact first
    const contactCheck = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [contactId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactCheck.rows[0];

    // Check permissions (only seller or buyer involved can delete)
    if (contact.seller_id !== userId && contact.buyer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { post_id, chat_id } = contact;

    // 1. Remove contact from old_item_posts contacts array
    if (post_id) {
      const postResult = await pool.query(
        'SELECT contacts FROM old_item_posts WHERE id = $1',
        [post_id]
      );

      if (postResult.rows.length > 0) {
        let contactsArray = postResult.rows[0].contacts || [];
        // Filter out the deleted contact
        const updatedContacts = contactsArray.filter(c => c.contact_id !== contactId);

        await pool.query(
          'UPDATE old_item_posts SET contacts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(updatedContacts), post_id]
        );
      }
    }

    // 2. Delete the contact record
    await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);

    // 3. Delete the associated chat (if exists)
    if (chat_id) {
      // Check if chat is used by other contacts (unlikely in this flow but safe)
      const otherContacts = await pool.query(
        'SELECT 1 FROM contacts WHERE chat_id = $1',
        [chat_id]
      );

      if (otherContacts.rows.length === 0) {
        await pool.query('DELETE FROM chats WHERE id = $1', [chat_id]);
      }
    }

    res.json({ message: 'Contact cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling contact:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// CHAT ENDPOINTS
// ============================================

// Get chat messages
app.get('/chats/:id', authMiddleware, async (req, res) => {
  try {
    // Verify user has access to this chat through contacts
    const contactCheck = await pool.query(
      `SELECT * FROM contacts WHERE chat_id = $1 AND (seller_id = $2 OR buyer_id = $2)`,
      [req.params.id, req.user.user_id]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query('SELECT * FROM chats WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send message to chat
app.post('/chats/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { text, image } = req.body;

    // Verify user has access to this chat
    const contactCheck = await pool.query(
      `SELECT * FROM contacts WHERE chat_id = $1 AND (seller_id = $2 OR buyer_id = $2)`,
      [req.params.id, req.user.user_id]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      try {
        const base64Image = image.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `chat/${req.params.id}_${Date.now()}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
      } catch (err) {
        console.error('Chat image upload failed:', err);
        // Continue without image or return error depending on requirements
        // For now, we continue but log error
      }
    }

    const message = {
      id: Date.now().toString(),
      sender_id: req.user.user_id,
      text: text || null,
      image_url: imageUrl,
      timestamp: new Date().toISOString()
    };

    const result = await pool.query(
      `UPDATE chats
       SET messages = messages || $1::JSONB,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([message]), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ message, chat: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

async function start() {
  await waitForDatabase();
  await initBucket();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
