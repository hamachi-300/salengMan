const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Minio = require('minio');
const fileUpload = require('express-fileupload');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Helper to get current time in Bangkok (UTC+7)
const getBangkokTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
};

// Database connection
const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else if (process.env.POSTGRES_USER) {
  poolConfig.user = process.env.POSTGRES_USER;
  poolConfig.host = process.env.POSTGRES_HOST || 'localhost';
  poolConfig.database = process.env.POSTGRES_DB;
  poolConfig.password = process.env.POSTGRES_PASSWORD;
  poolConfig.port = process.env.POSTGRES_PORT || 5432;
}

const pool = new Pool(poolConfig);

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

// Migration: Add chat_id to esg_tasks
async function runMigrations() {
  try {
    await pool.query('ALTER TABLE esg_tasks ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id)');
    await pool.query('ALTER TABLE trash_posts ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL');
    await pool.query("ALTER TABLE trash_posts ADD COLUMN IF NOT EXISTS waiting_status VARCHAR(20) DEFAULT 'wait'");
    await pool.query("UPDATE trash_posts SET waiting_status = 'wait' WHERE waiting_status IS NULL");
    // Backfill chat_id from esg_subscriptors if missing
    await pool.query(`
      UPDATE esg_tasks t
      SET chat_id = (
        SELECT (sub_day->>'chat_id')::UUID
        FROM esg_subscriptors s, jsonb_array_elements(s.pickup_days) sub_day
        WHERE s.sup_id = t.esg_subscriptor_id
          AND (sub_day->>'confirmed_driver_id' = t.esg_driver_id OR sub_day->'driver' @> jsonb_build_array(t.esg_driver_id))
          AND (sub_day->>'date')::INT = EXTRACT(DAY FROM t.date)::INT
        LIMIT 1
      )
      WHERE chat_id IS NULL
    `);
    console.log('Migration: chat_id added and backfilled in esg_tasks');

    // Create trash_bin_addresses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trash_bin_addresses (
        address_id TEXT PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        note TEXT,
        province VARCHAR(100),
        district VARCHAR(100),
        images TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
        updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trash_bin_addresses_location ON trash_bin_addresses(lat, lng)');
    
    // Update coin_transactions table
    await pool.query('ALTER TABLE coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_type_check');
    await pool.query("ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_type_check CHECK (type IN ('buy', 'use', 'earn', 'deposit'))");
    await pool.query('ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT');
    
    console.log('Migration: coin_transactions table updated and trash_bin_addresses index checked');
  } catch (err) {
    console.error('Migration error:', err);
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

const adminAuthMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Seed initial admin user
async function seedAdmin() {
  try {
    const adminCheck = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const email = process.env.ADMIN_SEED_EMAIL || 'admin@salengman.com';
      const username = process.env.ADMIN_SEED_USERNAME || 'admin';
      const password = process.env.ADMIN_SEED_PASSWORD || '12345678';

      console.log(`No admin found. Seeding default admin (${username})...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, gender)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, hashedPassword, username, 'admin', 'other']
      );
      console.log(`Default admin (${username}) created successfully.`);
    } else {
      console.log('Admin user already exists.');
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: getBangkokTime().toISOString().replace('Z', '+07:00'),
      database: 'connected' // Simple check
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

// Admin Reports Management
app.get('/admin/reports/problem', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, u.full_name as reporter_name, u.email as reporter_email
      FROM problem_reports pr
      JOIN users u ON pr.user_id = u.id
      ORDER BY pr.timestamp DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/reports/user', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ur.*,
             u1.full_name as reporter_name, u1.email as reporter_email,
             u2.full_name as reported_name, u2.email as reported_email
      FROM user_reports ur
      JOIN users u1 ON ur.reporter_id = u1.id
      JOIN users u2 ON ur.reported_user_id = u2.id
      ORDER BY ur.timestamp DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/reports/problem/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, u.full_name as reporter_name, u.email as reporter_email
      FROM problem_reports pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/reports/user/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ur.*,
             u1.full_name as reporter_name, u1.email as reporter_email,
             u2.full_name as reported_name, u2.email as reported_email
      FROM user_reports ur
      JOIN users u1 ON ur.reporter_id = u1.id
      JOIN users u2 ON ur.reported_user_id = u2.id
      WHERE ur.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/admin/reports/problem/:id/read', adminAuthMiddleware, async (req, res) => {
  try {
    const { is_read } = req.body;
    const result = await pool.query(
      'UPDATE problem_reports SET is_read = $1 WHERE id = $2 RETURNING *',
      [is_read, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/admin/reports/user/:id/read', adminAuthMiddleware, async (req, res) => {
  try {
    const { is_read } = req.body;
    const result = await pool.query(
      'UPDATE user_reports SET is_read = $1 WHERE id = $2 RETURNING *',
      [is_read, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/reports/problem/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM problem_reports WHERE id = $1', [req.params.id]);
    res.json({ message: 'Problem report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/reports/user/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_reports WHERE id = $1', [req.params.id]);
    res.json({ message: 'User report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin User Management
app.get('/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, email, full_name, phone, role, gender, avatar_url, created_at, coin, default_address FROM users WHERE role != \'admin\'';
    const params = [];

    if (role) {
      if (role === 'seller') {
        query += ' AND (role = \'customer\' OR role = \'seller\')';
      } else {
        query += ' AND role = $1';
        params.push(role);
      }
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/users/ban', adminAuthMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    await client.query('BEGIN');

    // Add to banned_emails
    await client.query(
      'INSERT INTO banned_emails (email, reason) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET reason = $2',
      [email, reason || 'No reason provided']
    );

    // Delete existing user(s) with this email
    await client.query('DELETE FROM users WHERE email = $1', [email]);

    await client.query('COMMIT');
    res.json({ message: `User ${email} has been banned and removed from the system.` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/admin/banned-emails', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banned_emails ORDER BY banned_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/users/ban/:email', adminAuthMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    await pool.query('DELETE FROM banned_emails WHERE email = $1', [email]);
    res.json({ message: `Email ${email} has been unbanned.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/notifications/send', adminAuthMiddleware, async (req, res) => {
  try {
    const { user_identifier, notify_header, notify_content } = req.body;

    if (!user_identifier || !notify_header || !notify_content) {
      return res.status(400).json({ error: 'User identifier, header, and content are required' });
    }

    // Find user by email or id
    // Note: Prioritize ID for uniqueness if multiple users share an email (roles case)
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id::text = $1 OR email = $1 LIMIT 1",
      [user_identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userResult.rows[0].id;

    // Insert notification
    await pool.query(
      `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type)
       VALUES ($1, $2, $3, $4)`,
      [targetUserId, notify_header, notify_content, 'admin_message']
    );

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ error: error.message });
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

    // Check for banned emails
    const bannedCheck = await pool.query('SELECT 1 FROM banned_emails WHERE email = $1', [email]);
    if (bannedCheck.rows.length > 0) {
      return res.status(403).json({ error: 'This email is banned from the platform.' });
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
    if (role === 'admin') {
      // For admin, use full_name as the username
      result = await pool.query(
        'SELECT * FROM users WHERE full_name = $1 AND role = $2',
        [email, role]
      );
    } else if (role) {
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
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        gender: user.gender,
        coin: user.coin,
        default_address: user.default_address
      },
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
      'SELECT id, email, full_name, phone, role, avatar_url, gender, coin, default_address FROM users WHERE id = $1',
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
      `UPDATE users SET ${updates.join(', ')}, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
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
    const identifier = req.params.id;
    const isEsgId = identifier.startsWith('DRV-ESG-');

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone as user_phone, u.avatar_url, u.created_at,
              a.address as default_address, a.phone as address_phone, ed.driver_id as esg_driver_id
       FROM users u
       LEFT JOIN addresses a ON u.id = a.user_id AND a.is_default = true
       LEFT JOIN esg_driver ed ON u.id = ed.user_id
       WHERE ${isEsgId ? 'ed.driver_id = $1' : 'u.id = $1'}`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user score
app.get('/users/:id/score', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT score, reviewed_user_id FROM old_item_post_scores WHERE user_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({ score: 0.0, reviewed_user_id: [] });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Submit a review for a user
app.post('/users/:id/review', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const targetUserId = req.params.id;
    const reviewerId = req.user.user_id;
    const { score, postId } = req.body;

    if (score === undefined || postId === undefined) {
      return res.status(400).json({ error: 'Score and postId are required' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    if (targetUserId === reviewerId) {
      return res.status(400).json({ error: 'You cannot review yourself' });
    }

    await client.query('BEGIN');

    // 1. Get current score data and lock the row
    const scoreResult = await client.query(
      'SELECT score, reviewed_user_id FROM old_item_post_scores WHERE user_id = $1 FOR UPDATE',
      [targetUserId]
    );

    let currentScore = 0.0;
    let reviews = [];

    if (scoreResult.rows.length > 0) {
      currentScore = parseFloat(scoreResult.rows[0].score);
      reviews = scoreResult.rows[0].reviewed_user_id || [];
    }

    // 2. Check if this specific reviewer already reviewed this specific post
    const existingReview = reviews.find(
      r => r.reviewer_id === reviewerId && r.post_id === postId
    );

    if (existingReview) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You have already reviewed this user for this post' });
    }

    // 3. Add new review
    const newReview = {
      reviewer_id: reviewerId,
      post_id: postId,
      score: score,
      created_at: getBangkokTime().toISOString().replace('Z', '+07:00')
    };

    reviews.push(newReview);

    // 4. Calculate new average score
    const totalScore = reviews.reduce((sum, r) => sum + r.score, 0);
    const newAverage = totalScore / reviews.length;

    // 5. Update or Insert
    if (scoreResult.rows.length > 0) {
      await client.query(
        `UPDATE old_item_post_scores SET score = $1, reviewed_user_id = $2::jsonb, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE user_id = $3`,
        [newAverage, JSON.stringify(reviews), targetUserId]
      );
    } else {
      // Fallback in case the user doesn't have a score record yet (should be rare due to our trigger)
      await client.query(
        'INSERT INTO old_item_post_scores (user_id, score, reviewed_user_id) VALUES ($1, $2, $3::jsonb)',
        [targetUserId, newAverage, JSON.stringify(reviews)]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, newScore: newAverage, reviewCount: reviews.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  } finally {
    client.release();
  }
});

// Check if a review already exists
app.get('/users/:id/review/check', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const reviewerId = req.user.user_id;
    const postId = req.query.postId;

    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }

    const scoreResult = await pool.query(
      'SELECT reviewed_user_id FROM old_item_post_scores WHERE user_id = $1',
      [targetUserId]
    );

    let hasReviewed = false;
    if (scoreResult.rows.length > 0) {
      const reviews = scoreResult.rows[0].reviewed_user_id || [];
      hasReviewed = reviews.some(r => r.reviewer_id === reviewerId && r.post_id === parseInt(postId));
    }

    res.json({ hasReviewed });
  } catch (error) {
    console.error('Error checking review status:', error);
    res.status(500).json({ error: 'Failed to check review status' });
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

// Get addresses for a specific user (restricted to authenticated users)
app.get('/addresses/user/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.params.id]
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
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM old_item_posts WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];

    // If pending, completed, or cancelled, ensure it has chat_id and driver info in contacts
    if ((post.status === 'pending' || post.status === 'completed' || post.status === 'cancelled') && post.contacts && post.contacts.length > 0) {
      const contactId = post.contacts[0].contact_id;
      const driverId = post.contacts[0].driver_id;

      const contactResult = await client.query(
        'SELECT chat_id FROM contacts WHERE id = $1',
        [contactId]
      );
      if (contactResult.rows.length > 0 && contactResult.rows[0].chat_id) {
        post.contacts[0].chat_id = contactResult.rows[0].chat_id;
      }

      // Fetch driver details
      if (driverId) {
        const driverResult = await client.query(
          'SELECT full_name, avatar_url, phone FROM users WHERE id = $1',
          [driverId]
        );
        if (driverResult.rows.length > 0) {
          const driverData = driverResult.rows[0];
          post.contacts[0].driver_name = driverData.full_name;
          post.contacts[0].driver_avatar = driverData.avatar_url;
          // You might combine phone logic depending on database structure
          post.contacts[0].driver_phone = driverData.phone;
        }
      }
    }

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
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

// Delete all notifications for a user
app.delete('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    await pool.query(
      'DELETE FROM notifies WHERE notify_user_id = $1',
      [userId]
    );
    res.json({ message: 'Notifications cleared successfully' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
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
           updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
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

// Cancel post (specifically for pending posts)
app.post('/old-item-posts/:id/cancel', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for cancellation' });
    }

    await client.query('BEGIN');

    // 1. Check post ownership and status
    const postCheck = await client.query(
      'SELECT * FROM old_item_posts WHERE id = $1 AND user_id = $2',
      [id, req.user.user_id]
    );

    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    const post = postCheck.rows[0];
    if (post.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only pending posts can be cancelled through this flow' });
    }

    // 2. Fetch the confirmed contact to get buyer_id
    const contactResult = await client.query(
      "SELECT id, buyer_id FROM contacts WHERE post_id = $1 AND status IN ('confirmed', 'wait complete')",
      [id]
    );

    if (contactResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No confirmed buyer found for this post' });
    }

    const contact = contactResult.rows[0];

    // 3. Update post status to 'cancelled'
    await client.query(
      "UPDATE old_item_posts SET status = 'cancelled', updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE id = $1",
      [id]
    );

    // 4. Update contact status to 'cancelled'
    await client.query(
      "UPDATE contacts SET status = 'cancelled', updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE id = $1",
      [contact.id]
    );

    // 5. Create notification for buyer
    await client.query(
      `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type, refer_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        contact.buyer_id,
        "Post Old Item Cancelled From Seller",
        reason,
        'cancelled contact',
        contact.id
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Post cancelled and buyer notified successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling post:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
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
// TRASH POSTS ENDPOINTS
// ============================================

app.patch('/trash-posts/complete-all', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const driverId = req.user.user_id;
    console.log(`[TRASH] Starting completion and coin transfer for driver: ${driverId}`);
    
    await client.query('BEGIN');

    // 1. Get posts that will be completed to calculate total coins
    const postsToComplete = await client.query(
      "SELECT id, coins_selected FROM trash_posts WHERE driver_id = $1 AND status = 'received' AND waiting_status = 'accepted' FOR UPDATE",
      [driverId]
    );

    if (postsToComplete.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ message: 'No received jobs found to complete', count: 0 });
    }

    const totalCoins = postsToComplete.rows.reduce((sum, post) => sum + (post.coins_selected || 0), 0);
    const postIds = postsToComplete.rows.map(p => p.id);

    // 2. Update trash posts status
    await client.query(
      "UPDATE trash_posts SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)",
      [postIds]
    );

    // 3. Transfer coins to driver if any
    if (totalCoins > 0) {
      await client.query(
        "UPDATE users SET coin = COALESCE(coin, 0) + $1 WHERE id = $2",
        [totalCoins, driverId]
      );

      // 4. Record coin transaction for driver
      await client.query(
        "INSERT INTO coin_transactions (user_id, amount, type, reference_id) VALUES ($1, $2, 'earn', $3)",
        [driverId, totalCoins, `TRASH_COMPLETED_${postIds.join('_')}`.substring(0, 50)]
      );
    }

    await client.query('COMMIT');
    
    console.log(`[TRASH] Successfully completed ${postIds.length} posts. Earned ${totalCoins} coins for driver ${driverId}`);
    res.json({ 
      message: 'Jobs completed and coins transferred successfully', 
      count: postIds.length, 
      earned: totalCoins 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[TRASH] Error in complete-all transaction:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


app.post('/trash-posts', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { images, remarks, address, pickupTime, coins, bags } = req.body;
    const userId = req.user.user_id;

    await client.query('BEGIN');

    // 1. Check if user has enough coins
    const userResult = await client.query('SELECT coin FROM users WHERE id = $1', [userId]);
    const currentBalance = userResult.rows[0]?.coin || 0;
    if (currentBalance < (coins || 0)) {
      throw new Error('Insufficient coins');
    }

    // 2. Upload images
    const uploadedImageUrls = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.startsWith('data:')) {
          const base64Image = img.split(';base64,').pop();
          const buffer = Buffer.from(base64Image, 'base64');
          const fileName = `trash_posts/${userId}_${Date.now()}_${i}.jpg`;
          await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, { 'Content-Type': 'image/jpeg' });
          uploadedImageUrls.push(`${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`);
        } else {
          uploadedImageUrls.push(img);
        }
      }
    }

    // 3. Deduct coins and record transaction if coins > 0
    if (coins && coins > 0) {
      await client.query('UPDATE users SET coin = coin - $1 WHERE id = $2', [coins, userId]);
      await client.query(
        "INSERT INTO coin_transactions (user_id, amount, type) VALUES ($1, $2, 'use')",
        [userId, coins]
      );
    }

    // 4. Create trash post
    const result = await client.query(
      `INSERT INTO trash_posts (user_id, images, remarks, address_snapshot, contact_snapshot, status, waiting_status, coins_selected, trash_bag_amount, user_coin_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, uploadedImageUrls, remarks, JSON.stringify(address), JSON.stringify(pickupTime), 'waiting', 'wait', coins || 0, bags || 1, currentBalance]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating trash post:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/trash-posts/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { images, remarks, address, pickupTime, coins, bags } = req.body;
    const userId = req.user.user_id;

    await client.query('BEGIN');

    // 1. Check ownership and status
    const postResult = await client.query(
      'SELECT * FROM trash_posts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (postResult.rows.length === 0) {
      throw new Error('Post not found or unauthorized');
    }

    const post = postResult.rows[0];
    if (post.status !== 'waiting') {
      throw new Error('Only waiting posts can be edited');
    }

    // 2. Handle coins (only if they changed, for simplicity we assume the amount is the same or handled by front end logic if they change coins they buy more)
    // NOTE: In a real system you'd calculate difference and refund/charge.
    // For now we'll update the record, assuming front end handled balance check.
    // BUT since we skipped complex coin handling for edit flow, we'll just update the metadata.
    // If coins increased from old value, charge user.
    const oldCoins = post.coins_selected || 0;
    const newCoins = coins || 0;
    if (newCoins > oldCoins) {
      const diff = newCoins - oldCoins;
      const userResult = await client.query('SELECT coin FROM users WHERE id = $1', [userId]);
      if ((userResult.rows[0]?.coin || 0) < diff) throw new Error('Insufficient coins for update');
      await client.query('UPDATE users SET coin = coin - $1 WHERE id = $2', [diff, userId]);
      await client.query("INSERT INTO coin_transactions (user_id, amount, type) VALUES ($1, $2, 'use')", [userId, diff]);
    } else if (newCoins < oldCoins) {
      const diff = oldCoins - newCoins;
      await client.query('UPDATE users SET coin = coin + $1 WHERE id = $2', [diff, userId]);
      await client.query("INSERT INTO coin_transactions (user_id, amount, type) VALUES ($1, $2, 'refund')", [userId, diff]);
    }

    // 3. Handle images
    const uploadedImageUrls = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.startsWith('data:')) {
          const base64Image = img.split(';base64,').pop();
          const buffer = Buffer.from(base64Image, 'base64');
          const fileName = `trash_posts/${userId}_${Date.now()}_${i}.jpg`;
          await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, { 'Content-Type': 'image/jpeg' });
          uploadedImageUrls.push(`${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`);
        } else {
          uploadedImageUrls.push(img);
        }
      }
    }

    // Cleanup old images not in the new list
    if (post.images) {
      for (const oldImg of post.images) {
        if (!uploadedImageUrls.includes(oldImg)) {
          const objectName = oldImg.split(`${BUCKET_NAME}/`)[1];
          if (objectName) await minioClient.removeObject(BUCKET_NAME, objectName).catch(() => {});
        }
      }
    }

    // 4. Update post
    const result = await client.query(
      `UPDATE trash_posts
       SET images = $1,
           remarks = $2,
           address_snapshot = $3,
           contact_snapshot = $4,
           coins_selected = $5,
           trash_bag_amount = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [uploadedImageUrls, remarks, JSON.stringify(address), JSON.stringify(pickupTime), newCoins, bags || 1, id, userId]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating trash post:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/trash-posts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trash_posts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/trash-posts/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trash_posts WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/trash-posts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT * FROM trash_posts WHERE id = $1 AND user_id = $2', [id, req.user.user_id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found or unauthorized' });
    
    const post = check.rows[0];
    if (post.images) {
      for (const imgUrl of post.images) {
        const objectName = imgUrl.split(`${BUCKET_NAME}/`)[1];
        if (objectName) await minioClient.removeObject(BUCKET_NAME, objectName);
      }
    }

    await pool.query('DELETE FROM trash_posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/trash-posts/available/all', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM trash_posts WHERE status = 'waiting' AND waiting_status = 'wait' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/trash-posts/:id/accept', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const driverId = req.user.user_id;

    await client.query('BEGIN');

    // 1. Check if post is still available
    const postResult = await client.query(
      "SELECT * FROM trash_posts WHERE id = $1 AND status = 'waiting' AND waiting_status = 'wait' FOR UPDATE",
      [id]
    );

    if (postResult.rows.length === 0) {
      throw new Error('Post no longer available or already accepted');
    }

    // 2. Update post status
    await client.query(
      "UPDATE trash_posts SET waiting_status = 'accepted', driver_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [driverId, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Job accepted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting trash post:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/trash-posts/status/received', authMiddleware, async (req, res) => {
  try {
    const driverId = req.user.user_id;
    const result = await pool.query(
      "SELECT * FROM trash_posts WHERE status = 'received' AND waiting_status = 'accepted' AND driver_id = $1 ORDER BY updated_at DESC",
      [driverId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/trash-posts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM trash_posts WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/trash-posts/:id/receive', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.user_id;

    const result = await pool.query(
      "UPDATE trash_posts SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND driver_id = $2 RETURNING *",
      [id, driverId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Post not found or not accepted by you' });
    }

    res.json({ message: 'Post marked as received', post: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// (Obsolete endpoints removed during refactor)

// Get nearby drivers (using PostGIS)


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
      `UPDATE orders SET status = $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
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
             updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
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
    const idInput = req.params.id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idInput);

    const query = `
      SELECT c.*,
             oip.images, oip.categories, oip.remarks, oip.status as post_status, oip.address_snapshot,
             seller.full_name as seller_name, seller.phone as seller_phone, seller.avatar_url as seller_avatar,
             buyer.full_name as buyer_name, buyer.phone as buyer_phone, buyer.avatar_url as buyer_avatar
      FROM contacts c
      JOIN old_item_posts oip ON c.post_id = oip.id
      JOIN users seller ON c.seller_id = seller.id
      JOIN users buyer ON c.buyer_id = buyer.id
      WHERE ${isUUID ? 'c.id = $1' : 'c.post_id = $1'} AND (c.seller_id = $2 OR c.buyer_id = $2)
    `;

    const result = await pool.query(query, [idInput, req.user.user_id]);

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
  const client = await pool.connect();
  try {
    const { status } = req.body;
    const contactId = req.params.id;

    await client.query('BEGIN');

    // 1. Fetch current status and check permissions
    const currentContact = await client.query(
      'SELECT id, status, seller_id, buyer_id, post_id, chat_id, type FROM contacts WHERE id = $1',
      [contactId]
    );

    if (currentContact.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = currentContact.rows[0];

    // If already completed, nothing more to do (prevent accidental rollbacks)
    if (contact.status === 'completed') {
      await client.query('COMMIT');
      return res.json(contact);
    }

    const isSeller = contact.seller_id === req.user.user_id;
    const isBuyer = contact.buyer_id === req.user.user_id;

    if (!isSeller && !isBuyer) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Buyer constraints: only allow updating to 'wait complete'
    if (isBuyer && !isSeller && status !== 'wait complete') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Drivers can only set status to wait complete' });
    }

    // 2. Update the target contact status
    const updateResult = await client.query(
      `UPDATE contacts SET status = $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       WHERE id = $2
       RETURNING *`,
      [status, contactId]
    );

    const updatedContact = updateResult.rows[0];

    // 2. If status is 'confirmed', perform cleanup and update post
    if (status === 'confirmed') {
      const postId = contact.post_id;

      // Update post status to 'pending' and clear other contacts in array
      await client.query(
        `UPDATE old_item_posts 
         SET status = 'pending',
             contacts = $1::JSONB,
             updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
         WHERE id = $2`,
        [JSON.stringify([{ contact_id: contactId, driver_id: contact.buyer_id, chat_id: contact.chat_id }]), postId]
      );

      // Fetch other contacts before deleting to clean up chats
      const otherContactsResult = await client.query(
        `SELECT id, chat_id FROM contacts WHERE post_id = $1 AND id != $2`,
        [postId, contactId]
      );

      const otherContactIds = otherContactsResult.rows.map(c => c.id);
      const otherChatIds = otherContactsResult.rows.map(c => c.chat_id).filter(id => id && id !== contact.chat_id);

      if (otherContactIds.length > 0) {
        // Delete other contacts
        await client.query(
          `DELETE FROM contacts WHERE id = ANY($1)`,
          [otherContactIds]
        );

        // Delete associated chats
        if (otherChatIds.length > 0) {
          await client.query(
            `DELETE FROM chats WHERE id = ANY($1)`,
            [otherChatIds]
          );
        }
      }
    }

    // 3. If status is 'completed', update associated post status
    if (status === 'completed') {
      const postId = contact.post_id;
      await client.query(
        `UPDATE old_item_posts 
         SET status = 'completed',
             updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
         WHERE id = $1`,
        [postId]
      );
    }

    if (status === 'wait complete') {
      await client.query(
        `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type, refer_id, contact_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          contact.seller_id,
          "Driver make complete old item post contact",
          "Your post have required to check if it complete from buyer, Make it complete if you already recieve money from buyer.",
          "require complete",
          contact.post_id,
          contact.type
        ]
      );
    }

    await client.query('COMMIT');
    res.json(contact);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating contact status:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Cancel contact (specifically for pending/confirmed contacts by driver)
app.post('/contacts/:id/cancel', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for cancellation' });
    }

    await client.query('BEGIN');

    // 1. Check contact exists and user is the buyer
    const contactResult = await client.query(
      'SELECT * FROM contacts WHERE id = $1 AND buyer_id = $2',
      [id, req.user.user_id]
    );

    if (contactResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contact not found or unauthorized' });
    }

    const contact = contactResult.rows[0];

    if (contact.status !== 'confirmed' && contact.status !== 'wait complete') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only confirmed or waiting complete contacts can be cancelled through this flow' });
    }

    // 2. Update contact status to 'cancelled'
    await client.query(
      "UPDATE contacts SET status = 'cancelled', updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE id = $1",
      [id]
    );

    // 3. Update associated post status to 'cancelled'
    if (contact.post_id) {
      await client.query(
        "UPDATE old_item_posts SET status = 'cancelled', updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE id = $1",
        [contact.post_id]
      );
    }

    // 4. Create notification for seller
    await client.query(
      `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type, refer_id, contact_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        contact.seller_id,
        "Post Old Item Cancelled From Buyer",
        reason,
        "cancelled contact",
        contact.post_id,
        contact.type
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Contact cancelled and seller notified successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling contact:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get chat details
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

    // Auto-clear active chat notifications for this user and this chat room
    await pool.query(
      `DELETE FROM notifies 
       WHERE notify_user_id = $1 
         AND refer_id = $2 
         AND type = 'chat'`,
      [req.user.user_id, req.params.id]
    ).catch(err => console.error('Error auto-clearing chat notifications:', err));

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
      timestamp: getBangkokTime().toISOString().replace('Z', '+07:00')
    };

    const result = await pool.query(
      `UPDATE chats
       SET messages = messages || $1::JSONB,
           updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([message]), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const updatedChat = result.rows[0];

    // Notification Logic
    const oppositeUserId = contactCheck.rows[0].seller_id === req.user.user_id
      ? contactCheck.rows[0].buyer_id
      : contactCheck.rows[0].seller_id;

    // We only notify if the new message is the first message OR if the previous message was from the opposite user.
    // That means we don't spam notifications if the same user sends 5 messages in a row.
    let shouldNotify = false;
    const allMessages = updatedChat.messages || [];

    if (allMessages.length === 1) {
      // First message in chat
      shouldNotify = true;
    } else if (allMessages.length > 1) {
      const prevMessage = allMessages[allMessages.length - 2];
      if (prevMessage.sender_id !== req.user.user_id) {
        shouldNotify = true;
      }
    }

    if (shouldNotify && oppositeUserId) {
      const notifyHeader = "new chat";
      const notifyContent = text ? (text.length > 50 ? text.substring(0, 50) + "..." : text) : "Sent an image";

      await pool.query(
        `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type, refer_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [oppositeUserId, notifyHeader, notifyContent, 'chat', req.params.id]
      ).catch(err => console.error('Error inserting chat notification:', err));
    }

    res.json({ message, chat: updatedChat });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// REPORTING ENDPOINTS
// ============================================

// Submit problem report (app issues)
app.post('/reports/problem', authMiddleware, async (req, res) => {
  try {
    const { header, content, image } = req.body;
    const userId = req.user.user_id;

    if (!header || !content) {
      return res.status(400).json({ error: 'Header and content are required' });
    }

    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      try {
        const base64Image = image.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `reports/problem/${userId}_${Date.now()}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
      } catch (err) {
        console.error('Problem report image upload failed:', err);
      }
    }

    const result = await pool.query(
      `INSERT INTO problem_reports (user_id, header, content, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, header, content, imageUrl]
    );

    res.json({ status: 'success', report: result.rows[0] });
  } catch (error) {
    console.error('Error submitting problem report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit user report (reporting another user)
app.post('/reports/user', authMiddleware, async (req, res) => {
  try {
    const { reported_user_id, header, content, image } = req.body;
    const reporterId = req.user.user_id;

    if (!reported_user_id || !header || !content) {
      return res.status(400).json({ error: 'Reported user ID, header, and content are required' });
    }

    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      try {
        const base64Image = image.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `reports/user/${reporterId}_to_${reported_user_id}_${Date.now()}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
      } catch (err) {
        console.error('User report image upload failed:', err);
      }
    }

    const result = await pool.query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, header, content, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reporterId, reported_user_id, header, content, imageUrl]
    );

    res.json({ status: 'success', report: result.rows[0] });
  } catch (error) {
    console.error('Error submitting user report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get notifications for current user
app.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifies WHERE notify_user_id = $1 ORDER BY timestamp DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(400).json({ error: error.message });
  }
});


// ============================================
// DRIVER LOCATION
// ============================================
app.post('/driver-location', authMiddleware, async (req, res) => {
  const { lat, lng, heading, speed } = req.body;
  const driver_id = req.user.user_id; // Using user_id from JWT payload

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    // Note: The table might have an auto-incrementing 'id' column, 
    // but we use 'driver_id' as our unique constraint.
    await pool.query(`
      INSERT INTO driver_locations (driver_id, lat, lng, heading, speed, updated_at)
      VALUES ($1, $2, $3, $4, $5, timezone('Asia/Bangkok', CURRENT_TIMESTAMP))
      ON CONFLICT (driver_id) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        heading = EXCLUDED.heading,
        speed = EXCLUDED.speed,
        updated_at = EXCLUDED.updated_at;
    `, [driver_id, lat, lng, heading || null, speed || null]);

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Database Error in /driver-location:', error);
    res.status(500).json({ error: error.message, detail: 'Check server logs for details' });
  }
});

app.get('/driver-location/:driver_id', authMiddleware, async (req, res) => {
  const { driver_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT lat, lng, heading, speed, updated_at FROM driver_locations WHERE driver_id = $1',
      [driver_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching driver location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BACKGROUND JOBS
// ============================================
async function checkExpiredPosts() {
  try {
    const result = await pool.query(
      `SELECT id, user_id, pickup_time 
       FROM old_item_posts 
       WHERE status = 'waiting' AND pickup_time IS NOT NULL`
    );

    const now = new Date();

    for (const post of result.rows) {
      // pickup_time is stored as JSONB, so it's already parsed into an object by pg if connected properly, or it might be string.
      let pickup_time = post.pickup_time;
      if (typeof pickup_time === 'string') {
        try {
          pickup_time = JSON.parse(pickup_time);
        } catch (e) { continue; }
      }

      if (!pickup_time || typeof pickup_time !== 'object') continue;

      const { date, endTime } = pickup_time;
      if (!date || !endTime) continue;

      // Construct expiration date in +07:00 timezone
      const expireString = `${date}T${endTime}:00+07:00`;
      const expireDate = new Date(expireString);

      if (now > expireDate) {
        // Post has expired. Check if notification already exists.
        const checkNotify = await pool.query(
          `SELECT 1 FROM notifies 
           WHERE refer_id = $1 AND type = 'old item post' AND notify_header = 'Old Item Post Expired'`,
          [post.id]
        );

        if (checkNotify.rows.length === 0) {
          await pool.query(
            `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type, refer_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              post.user_id,
              "Old Item Post Expired",
              "Your post is reach out of the time consider to delete it.",
              "old item post",
              post.id
            ]
          );
          console.log(`Notification sent for expired post ${post.id}`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking expired posts:', err);
  }
}

const PORT = process.env.PORT || 3000;

async function start() {
  await waitForDatabase();
  await initBucket();
  await seedAdmin(); // Add seeding here

  // Create driver_locations with all columns and unique constraint
  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      id SERIAL PRIMARY KEY,
      driver_id TEXT UNIQUE NOT NULL,
      lat DECIMAL NOT NULL,
      lng DECIMAL NOT NULL,
      heading DECIMAL,
      speed DECIMAL,
      updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
    );
  `);

  // Migration for driver_locations: Ensure driver_id is TEXT
  try {
    await pool.query(`
      ALTER TABLE driver_locations ALTER COLUMN driver_id TYPE TEXT;
    `);
  } catch (err) {
    // Already text or other compatibility issue
  }

  // Create esg_driver table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS esg_driver (
      driver_id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      coin NUMERIC DEFAULT 0,
      weight_accumulate NUMERIC DEFAULT 0,
      pickup_days JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      UNIQUE(user_id)
    );
  `).catch(err => console.error('Migration error (esg_driver):', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS esg_subscriptors (
      sup_id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      address_id INTEGER,
      package_name TEXT,
      pickup_days JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT TRUE,
      begin_sub TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      end_sub TIMESTAMPTZ,
      max_weight NUMERIC,
      time_per_month INTEGER,
      created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
    );
  `).catch(err => console.error('Migration error (esg_subscriptors):', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS esg_factors (
      sub_id TEXT PRIMARY KEY REFERENCES esg_subscriptors(sup_id) ON DELETE CASCADE,
      paper NUMERIC DEFAULT 0,
      plastic NUMERIC DEFAULT 0,
      metal NUMERIC DEFAULT 0,
      glass NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
    );
  `).catch(err => console.error('Migration error (esg_factors):', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS esg_package_history (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      package_name TEXT,
      max_weight NUMERIC,
      max_dates_per_month INTEGER,
      cost NUMERIC,
      total_cost NUMERIC,
      subscription_datetime TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
    );
  `).catch(err => console.error('Migration error (esg_package_history):', err.message));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS esg_tasks (
      tasks_id SERIAL PRIMARY KEY,
      esg_subscriptor_id TEXT REFERENCES esg_subscriptors(sup_id) ON DELETE CASCADE,
      esg_driver_id TEXT REFERENCES esg_driver(driver_id) ON DELETE CASCADE,
      date TIMESTAMPTZ NOT NULL,
      weight JSONB DEFAULT '[]'::jsonb,
      carbon_reduce NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'waiting',
      recycling_center_addresss_id TEXT DEFAULT '',
      tree_equivalent NUMERIC DEFAULT 0,
      evidences_images TEXT[] DEFAULT '{}',
      receipt_images TEXT[] DEFAULT '{}',
      chat_id UUID REFERENCES chats(id),
      created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
      complete_time TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
    );
    CREATE INDEX IF NOT EXISTS idx_esg_tasks_subscriptor_id ON esg_tasks(esg_subscriptor_id);
    CREATE INDEX IF NOT EXISTS idx_esg_tasks_driver_id ON esg_tasks(esg_driver_id);
    CREATE INDEX IF NOT EXISTS idx_esg_tasks_date ON esg_tasks(date);
  `).catch(err => console.error('Migration error (esg_tasks):', err.message));

  // --- MIGRATIONS FOR ESG TABLES ---
  try {
    // esg_tasks migrations: rename image column and add receipt column
    await pool.query(`
      DO $$
      BEGIN
        -- Rename column if exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'evidences_image') THEN
          ALTER TABLE esg_tasks RENAME COLUMN evidences_image TO evidences_images;
        END IF;

        -- Add receipt_images if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'receipt_images') THEN
          ALTER TABLE esg_tasks ADD COLUMN receipt_images TEXT[] DEFAULT '{}';
        END IF;

        -- Add chat_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'chat_id') THEN
          ALTER TABLE esg_tasks ADD COLUMN chat_id UUID REFERENCES chats(id);
        END IF;

        -- Rename recycling_center_addresss to recycling_center_addresss_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'recycling_center_addresss') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'recycling_center_addresss_id') THEN
          ALTER TABLE esg_tasks RENAME COLUMN recycling_center_addresss TO recycling_center_addresss_id;
        END IF;

        -- Ensure recycling_center_addresss_id exists (in case the base creation was updated)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'recycling_center_addresss_id') THEN
          ALTER TABLE esg_tasks ADD COLUMN recycling_center_addresss_id TEXT DEFAULT '';
        END IF;

        -- Add tree_equivalent NUMERIC if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'tree_equivalent') THEN
          ALTER TABLE esg_tasks ADD COLUMN tree_equivalent NUMERIC DEFAULT 0;
        END IF;

        -- Rename updated_at to complete_time
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'updated_at') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'esg_tasks' AND column_name = 'complete_time') THEN
          ALTER TABLE esg_tasks RENAME COLUMN updated_at TO complete_time;
        END IF;
      END $$;
    `);

    // esg_subscriptors migrations
    await pool.query(`
      ALTER TABLE esg_subscriptors ADD COLUMN IF NOT EXISTS address_id INTEGER;
      ALTER TABLE esg_subscriptors ADD COLUMN IF NOT EXISTS max_weight NUMERIC;
      ALTER TABLE esg_subscriptors ADD COLUMN IF NOT EXISTS time_per_month INTEGER;
      ALTER TABLE esg_subscriptors ALTER COLUMN pickup_days SET DEFAULT '[]'::jsonb;
    `);

    // Ensure pickup_days is JSONB
    await pool.query(`
      DO $$
      BEGIN
        -- If pickup_days is not jsonb (could be text or text[]), convert it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'esg_subscriptors' AND column_name = 'pickup_days' 
          AND udt_name != 'jsonb'
        ) THEN
          -- Drop and recreate is safest if the data is malformed for jsonb
          -- But we'll try to cast first
          BEGIN
            ALTER TABLE esg_subscriptors ALTER COLUMN pickup_days TYPE JSONB USING (pickup_days::text)::jsonb;
          EXCEPTION WHEN OTHERS THEN
            ALTER TABLE esg_subscriptors DROP COLUMN pickup_days;
            ALTER TABLE esg_subscriptors ADD COLUMN pickup_days JSONB DEFAULT '[]'::jsonb;
          END;
        END IF;
      END $$;
    `);
  } catch (err) {
    console.log('ESG Migration check (non-critical):', err.message);
  }

  console.log('Database tables initialized');

  // Ensure notifies table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifies(
    notify_id SERIAL PRIMARY KEY,
    notify_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notify_header TEXT NOT NULL,
    notify_content TEXT,
    timestamp TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
    type VARCHAR(50),
    refer_id VARCHAR(255),
    contact_type VARCHAR(50)
  );
  `).catch(err => console.error('Migration error (notifies):', err.message));

  // Migration for existing tables
  await pool.query(`
    DO $$
  BEGIN
        IF NOT EXISTS(
    SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifies' AND column_name = 'contact_type'
  ) THEN
            ALTER TABLE notifies ADD COLUMN contact_type VARCHAR(50);
        END IF;
    END $$;
  `).catch(err => console.error('Migration error (notifies contact_type):', err.message));

  // Migration for refer_id to VARCHAR
  await pool.query(`
    ALTER TABLE notifies ALTER COLUMN refer_id TYPE VARCHAR(255);
  `).catch(err => console.error('Migration error (notifies refer_id VARCHAR):', err.message));

  // Migration for problem_reports and user_reports
  await pool.query(`
    CREATE TABLE IF NOT EXISTS problem_reports(
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    header TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
  );
    CREATE TABLE IF NOT EXISTS user_reports(
    id SERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    header TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
  );

  --Ensure is_read column exists if tables were already created
    DO $$
  BEGIN
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'problem_reports' AND column_name = 'is_read') THEN
            ALTER TABLE problem_reports ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'is_read') THEN
            ALTER TABLE user_reports ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS banned_emails(
    email VARCHAR(255) PRIMARY KEY,
    reason TEXT,
    banned_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
  );

  -- Recycling Addresses table
  CREATE TABLE IF NOT EXISTS recycling_addresses (
    address_id TEXT PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    phone VARCHAR(20),
    note TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ DEFAULT timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
  );
  `).catch(err => console.error('Migration error (reports/banned/recycling tables):', err.message));

  // Run additional migrations after tables are created
  await runMigrations();

  // Start background jobs
  setInterval(checkExpiredPosts, 60000); // Check every 60 seconds

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} `);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// ============================================
// ESG SUBSCRIPTION
// ============================================
app.post('/esg/subscribe', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const {
      address_id,
      package_name,
      pickup_days,
      max_weight,
      time_per_month,
      cost,
      total_cost
    } = req.body;

    await client.query('BEGIN');

    // 1. Generate unique sup_id
    const sup_id = `ESG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 2. Subscription dates will be handled by PostgreSQL functions below

    // Safety check for pickup_days
    const safe_pickup_days = Array.isArray(pickup_days) ? pickup_days : [];

    // Mark selected dates 1-28
    const final_pickup_days = Array.from({ length: 29 }, (_, i) => {
      if (i === 0) return null;
      const selected = safe_pickup_days.find(d => {
        const dIdx = (d && typeof d === 'object') ? d.date : d;
        return dIdx === i;
      });

      if (selected) {
        return {
          date: i,
          have_driver: false,
          driver: []
        };
      }
      return null;
    });

    // 3. Insert into esg_subscriptors
    let subResult;
    try {
      subResult = await client.query(
        `INSERT INTO esg_subscriptors 
          (sup_id, user_id, address_id, package_name, pickup_days, is_active, begin_sub, end_sub, max_weight, time_per_month)
         VALUES ($1, $2, $3, $4, $5, $6, timezone('Asia/Bangkok', CURRENT_TIMESTAMP), timezone('Asia/Bangkok', CURRENT_TIMESTAMP) + INTERVAL '1 year', $7, $8)
         RETURNING *`,
        [sup_id, user_id, address_id, package_name, JSON.stringify(final_pickup_days), true, max_weight, time_per_month]
      );
    } catch (insertError) {
      console.error('Database Error in /esg/subscribe (subscriptors):', insertError);
      throw new Error(`Failed to save subscription: ${insertError.message}`);
    }

    // 4. Insert into esg_package_history
    let historyResult;
    try {
      historyResult = await client.query(
        `INSERT INTO esg_package_history 
          (user_id, package_name, max_weight, max_dates_per_month, cost, total_cost, subscription_datetime)
         VALUES ($1, $2, $3, $4, $5, $6, timezone('Asia/Bangkok', CURRENT_TIMESTAMP))
         RETURNING *`,
        [user_id, package_name, max_weight, time_per_month, cost, total_cost]
      );
    } catch (historyError) {
      console.error('Database Error in /esg/subscribe (history):', historyError);
      throw new Error(`Failed to save package history: ${historyError.message}`);
    }

    // 5. Initialize esg_factors
    try {
      await client.query(
        `INSERT INTO esg_factors (sub_id, paper, plastic, metal, glass)
         VALUES ($1, 0, 0, 0, 0)`,
        [sup_id]
      );
    } catch (factorError) {
      console.error('Database Error in /esg/subscribe (factors):', factorError);
      throw new Error(`Failed to initialize material tracking: ${factorError.message}`);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Subscription successful',
      subscription: subResult.rows[0],
      history: historyResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /esg/subscribe:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/esg/subscription/status', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;

    // 1. Check if the user has an active subscription that hasn't expired
    const activeResult = await client.query(
      `SELECT sup_id, package_name, end_sub, pickup_days 
       FROM esg_subscriptors 
       WHERE user_id = $1 AND is_active = true AND end_sub > timezone('Asia/Bangkok', CURRENT_TIMESTAMP) 
       ORDER BY end_sub DESC 
       LIMIT 1`,
      [user_id]
    );

    if (activeResult.rows.length > 0) {
      return res.json({
        hasActiveSubscription: true,
        sup_id: activeResult.rows[0].sup_id,
        package: activeResult.rows[0].package_name,
        expiresAt: activeResult.rows[0].end_sub,
        pickup_days: activeResult.rows[0].pickup_days
      });
    }

    // 2. Check if there is an expired subscription that is still marked as active
    const expiredResult = await client.query(
      `SELECT sup_id, pickup_days 
       FROM esg_subscriptors 
       WHERE user_id = $1 AND is_active = true AND end_sub <= timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       ORDER BY end_sub DESC LIMIT 1`,
      [user_id]
    );

    if (expiredResult.rows.length > 0) {
      const { sup_id, pickup_days } = expiredResult.rows[0];

      await client.query('BEGIN');

      // Reset subscription data
      const defaultPickupDays = Array.from({ length: 29 }, () => null);
      await client.query(
        `UPDATE esg_subscriptors SET 
            package_name = NULL,
            pickup_days = $2,
            is_active = false,
            begin_sub = NULL,
            end_sub = NULL,
            max_weight = 0,
            time_per_month = 0
         WHERE sup_id = $1`,
        [sup_id, JSON.stringify(defaultPickupDays)]
      );

      // Identify drivers to notify
      const driverIds = new Set();
      if (Array.isArray(pickup_days)) {
        pickup_days.forEach(day => {
          if (day && Array.isArray(day.driver)) {
            day.driver.forEach(dId => driverIds.add(dId));
          }
        });
      }

      // Update each driver and send notification
      for (const dId of driverIds) {
        const driverRes = await client.query(
          'SELECT user_id, pickup_days FROM esg_driver WHERE driver_id = $1',
          [dId]
        );

        if (driverRes.rows.length > 0) {
          const driverUserId = driverRes.rows[0].user_id;
          let driverPickupDays = driverRes.rows[0].pickup_days;

          if (Array.isArray(driverPickupDays)) {
            driverPickupDays = driverPickupDays.map(day => {
              if (day && Array.isArray(day.contract_user)) {
                day.contract_user = day.contract_user.filter(u => u.id !== sup_id);
              }
              return day;
            });

            await client.query(
              'UPDATE esg_driver SET pickup_days = $1 WHERE driver_id = $2',
              [JSON.stringify(driverPickupDays), dId]
            );
          }

          // Send notification to driver
          await client.query(
            `INSERT INTO notifies (notify_user_id, notify_header, notify_content, type) 
             VALUES ($1, $2, $3, $4)`,
            [driverUserId, 'your esg subscriptor expired', 'ผู้ทิ้งขยะที่คุณทำสัญญาด้วยหมดอายุแล้ว', 'esg_expired']
          );
        }
      }

      // Remove waiting and pending tasks
      await client.query(
        "DELETE FROM esg_tasks WHERE esg_subscriptor_id = $1 AND status IN ('waiting', 'pending')",
        [sup_id]
      );

      await client.query('COMMIT');
      return res.json({ hasActiveSubscription: false, wasExpired: true });
    }

    // No active or expired-active subscription
    res.json({ hasActiveSubscription: false });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error in /esg/subscription/status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/esg/interested-drivers/:sup_id/:date', authMiddleware, async (req, res) => {
  try {
    const { sup_id, date } = req.params;
    const user_id = req.user.user_id;

    const result = await pool.query(
      'SELECT pickup_days FROM esg_subscriptors WHERE sup_id = $1 AND user_id = $2',
      [sup_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const pickup_days = result.rows[0].pickup_days;
    // pickup_days is expected to be an array of objects
    const dayEntry = pickup_days.find(d => d && d.date === parseInt(date));

    if (!dayEntry) {
      return res.status(404).json({ error: 'Date not found in subscription' });
    }

    const driverIds = dayEntry.driver || [];
    if (driverIds.length === 0) {
      return res.json([]);
    }

    // Fetch public profiles for these drivers
    const profilesResult = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url, u.created_at, ed.driver_id 
       FROM users u 
       JOIN esg_driver ed ON u.id = ed.user_id 
       WHERE ed.driver_id = ANY($1)`,
      [driverIds]
    );

    res.json(profilesResult.rows);
  } catch (error) {
    console.error('Error in /esg/interested-drivers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/driver/status', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const result = await pool.query(
      'SELECT * FROM esg_driver WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length > 0) {
      res.json({ isRegistered: true, driver: result.rows[0] });
    } else {
      res.json({ isRegistered: false });
    }
  } catch (error) {
    console.error('Error in /esg/driver/status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/esg/driver/register', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const driver_id = `DRV-ESG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Initialize pickup_days with empty arrays for 28 days (index 1-28)
    const pickup_days = Array.from({ length: 29 }, (_, i) => i === 0 ? null : ({
      date: i,
      contract_user: []
    }));

    const result = await pool.query(
      `INSERT INTO esg_driver (driver_id, user_id, pickup_days)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       RETURNING *`,
      [driver_id, user_id, JSON.stringify(pickup_days)]
    );

    res.json({ success: true, driver: result.rows[0] });
  } catch (error) {
    console.error('Error in /esg/driver/register:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/driver/profile', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const result = await pool.query(
      'SELECT * FROM esg_driver WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driver = result.rows[0];
    const pickup_days = driver.pickup_days || [];

    // Get future jobs count for this driver (excluding today)
    const tasksRes = await pool.query(
      `SELECT COUNT(*) FROM esg_tasks 
       WHERE esg_driver_id = $1 
         AND (date AT TIME ZONE 'Asia/Bangkok')::date > (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date 
         AND status != 'skipped'`,
      [driver.driver_id]
    );
    const tomorrowJobsCount = parseInt(tasksRes.rows[0].count);

    // Get today's jobs count for this driver (Today's scheduled tasks + Unfinished overdue tasks)
    const todayRes = await pool.query(
      `SELECT COUNT(*) FROM esg_tasks 
       WHERE esg_driver_id = $1 
         AND (
           (date AT TIME ZONE 'Asia/Bangkok')::date = (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date 
           OR (status IN ('waiting', 'pending') AND (date AT TIME ZONE 'Asia/Bangkok')::date < (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date)
         )
         AND status != 'skipped'`,
      [driver.driver_id]
    );
    const todayJobsCount = parseInt(todayRes.rows[0].count);

    console.log(`[DriverProfile] user_id: ${user_id}, driver_id: ${driver.driver_id}`);
    console.log(`[DriverProfile] todayJobsCount: ${todayJobsCount}, tomorrowJobsCount: ${tomorrowJobsCount}`);

    res.json({
      ...driver,
      tomorrowJobsCount,
      todayJobsCount
    });
  } catch (error) {
    console.error('Error in /esg/driver/profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ESG Driver Stats & Deposit ---

/**
 * GET /esg/driver/weight-stats
 * Returns monthly aggregated weight from completed ESG tasks for the driver
 */
app.get('/esg/driver/weight-stats', authMiddleware, async (req, res) => {
  const userId = req.user.user_id;
  const client = await pool.connect();
  try {
    // 1. Get driver_id
    const driverRes = await client.query('SELECT driver_id FROM esg_driver WHERE user_id = $1', [userId]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    const driverId = driverRes.rows[0].driver_id;

    // 2. Aggregate weight by month for completed tasks
    const statsRes = await client.query(`
      WITH task_weights AS (
        SELECT 
          date_trunc('month', date AT TIME ZONE 'Asia/Bangkok') as month,
          (SELECT SUM((val->>'weight')::numeric) FROM jsonb_array_elements(weight) AS val) as total_weight
        FROM esg_tasks 
        WHERE esg_driver_id = $1 AND status = 'completed'
      )
      SELECT 
        to_char(month, 'YYYY-MM') as month,
        SUM(total_weight) as weight
      FROM task_weights
      GROUP BY month
      ORDER BY month ASC
    `, [driverId]);

    res.json(statsRes.rows);
  } catch (err) {
    console.error('Error fetching weight stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /esg/driver/deposit
 * Mock endpoint for depositing accumulated coins
 */
app.post('/esg/driver/deposit', authMiddleware, async (req, res) => {
  const userId = req.user.user_id;
  const client = await pool.connect();
  try {
    const driverRes = await client.query('SELECT driver_id, coin FROM esg_driver WHERE user_id = $1', [userId]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const driver = driverRes.rows[0];
    const coinValue = parseFloat(driver.coin || 0);

    if (coinValue < 100) {
      return res.status(400).json({ error: 'Minimum deposit is 100 coins' });
    }

    // Mock successful deposit: reset coins to 0
    await client.query('UPDATE esg_driver SET coin = 0 WHERE driver_id = $1', [driver.driver_id]);

    res.json({ success: true, message: 'Deposit successful', amount: coinValue });
  } catch (err) {
    console.error('Error processing deposit:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


app.get('/esg/available-subscriptions', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query; // date index 1-28

    let query = `
      SELECT s.*, u.full_name, u.avatar_url, u.email, u.created_at, u.phone as user_phone, a.address, a.sub_district, a.district, a.province, a.phone as address_phone, a.lat, a.lng
      FROM esg_subscriptors s
      JOIN users u ON s.user_id = u.id
      JOIN addresses a ON s.address_id = a.id
      WHERE s.is_active = true
    `;
    const params = [];

    // 1. Get current user's driver_id if they are a driver
    const driverLookup = await pool.query('SELECT driver_id FROM esg_driver WHERE user_id = $1', [req.user.user_id]);
    const currentEsgDriverId = driverLookup.rows.length > 0 ? driverLookup.rows[0].driver_id : null;

    const result = await pool.query(query, params);

    // List available subscriptions
    let filtered = result.rows.map(row => {
      const days = Array.isArray(row.pickup_days) ? row.pickup_days : [];

      const processedDays = days.map(d => {
        if (!d) return null;

        // Category Logic:
        // 1. Accept: finalized for this driver
        if (d.have_driver === true && d.confirmed_driver_id === currentEsgDriverId) {
          return { ...d, category: 'accept', alreadySigned: true };
        }

        // 2. Waiting: driver signed but subscriber hasn't finalized
        if (d.have_driver === false && currentEsgDriverId && d.driver && d.driver.includes(currentEsgDriverId)) {
          return { ...d, category: 'waiting', alreadySigned: true };
        }

        // 3. Discover: slot is open and driver hasn't signed yet
        if (d.have_driver === false && (!currentEsgDriverId || !d.driver || !d.driver.includes(currentEsgDriverId))) {
          return { ...d, category: 'discover', alreadySigned: false };
        }

        // Default: slot finalized for someone else (Exclude)
        return null;
      }).filter(Boolean);

      return { ...row, pickup_days: processedDays };
    }).filter(row => row.pickup_days.length > 0);

    // If specific date is requested, filter further
    if (date) {
      const dateIdx = parseInt(date);
      filtered = filtered.filter(row => {
        return row.pickup_days.some(d => d.date === dateIdx);
      });
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error in /esg/available-subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/esg/driver/contract', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { sup_id, date_index } = req.body;
    const user_id = req.user.user_id;

    await client.query('BEGIN');

    // 1. Get Driver Info
    const driverRes = await client.query('SELECT driver_id, pickup_days FROM esg_driver WHERE user_id = $1 FOR UPDATE', [user_id]);
    if (driverRes.rows.length === 0) throw new Error('Driver not registered');
    const driver = driverRes.rows[0];
    const driver_id = driver.driver_id;

    // 2. Get Subscriber Info
    const subRes = await client.query('SELECT pickup_days FROM esg_subscriptors WHERE sup_id = $1 FOR UPDATE', [sup_id]);
    if (subRes.rows.length === 0) throw new Error('Subscription not found');
    const sub_pickup_days = subRes.rows[0].pickup_days;

    // 3. Update Subscriber pickup_days
    const subDayIdx = sub_pickup_days.findIndex(d => d && d.date === parseInt(date_index));
    if (subDayIdx === -1) throw new Error('Date not found in subscription');

    // Initialize driver list if not exists
    if (!sub_pickup_days[subDayIdx].driver) sub_pickup_days[subDayIdx].driver = [];
    if (!sub_pickup_days[subDayIdx].driver.includes(driver_id)) {
      sub_pickup_days[subDayIdx].driver.push(driver_id);
    }
    // sub_pickup_days[subDayIdx].have_driver = true; // DO NOT set to true here, wait for subscriber confirmation

    // 4. Update Driver pickup_days
    const driver_pickup_days = driver.pickup_days;
    const driverDayIdx = parseInt(date_index);
    if (!driver_pickup_days[driverDayIdx]) throw new Error('Date index invalid for driver');

    if (!driver_pickup_days[driverDayIdx].contract_user) driver_pickup_days[driverDayIdx].contract_user = [];
    if (!driver_pickup_days[driverDayIdx].contract_user.find(u => u.id === sup_id)) {
      driver_pickup_days[driverDayIdx].contract_user.push({ id: sup_id, is_accept: false });
    }

    // Check limit warning (UI will handle, but good to know count)
    const currentJobs = driver_pickup_days[driverDayIdx].contract_user.length;

    // 5. Commit updates
    await client.query(
      `UPDATE esg_subscriptors SET pickup_days = $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE sup_id = $2`,
      [JSON.stringify(sub_pickup_days), sup_id]
    );

    await client.query(
      'UPDATE esg_driver SET pickup_days = $1 WHERE driver_id = $2',
      [JSON.stringify(driver_pickup_days), driver_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      warning: currentJobs > 4 ? 'You have exceeded the recommended number of jobs for this day (4 jobs).' : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /esg/driver/contract:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/esg/confirm-driver', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { sup_id, date, driver_id } = req.body; // driver_id can be UUID or ESG ID
    const user_id = req.user.user_id;

    await client.query('BEGIN');

    // 1. Get Driver Info to get their ESG ID and internal User ID
    const isEsgId = driver_id.startsWith('DRV-ESG-');
    const driverRes = await client.query(
      `SELECT user_id, driver_id, pickup_days 
       FROM esg_driver 
       WHERE ${isEsgId ? 'driver_id = $1' : 'user_id = $1'} 
       FOR UPDATE`,
      [driver_id]
    );

    if (driverRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const internal_driver_id = driverRes.rows[0].user_id;
    const esg_driver_id = driverRes.rows[0].driver_id;
    const dPickupDays = driverRes.rows[0].pickup_days;

    // 2. Create Chat
    const chatResult = await client.query(
      "INSERT INTO chats (messages) VALUES ('[]'::JSONB) RETURNING id"
    );
    const chatId = chatResult.rows[0].id;

    // 2.1 Create Contact Record for Authorization
    await client.query(
      `INSERT INTO contacts (id, post_id, seller_id, buyer_id, chat_id, status, type) 
       VALUES (uuid_generate_v4(), NULL, $1, $2, $3, 'accepted', 'esg')`,
      [user_id, internal_driver_id, chatId]
    );

    // 3. Get and Update Subscriber Table
    const subResult = await client.query(
      'SELECT pickup_days FROM esg_subscriptors WHERE sup_id = $1 AND user_id = $2 FOR UPDATE',
      [sup_id, user_id]
    );

    if (subResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const pickup_days = subResult.rows[0].pickup_days;
    const dayIndex = pickup_days.findIndex(d => d && d.date === parseInt(date));

    if (dayIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Date not found in subscription' });
    }

    pickup_days[dayIndex].have_driver = true;
    pickup_days[dayIndex].confirmed_driver_id = esg_driver_id;
    pickup_days[dayIndex].chat_id = chatId;
    pickup_days[dayIndex].driver = [esg_driver_id]; // Only the confirmed driver remains

    await client.query(
      `UPDATE esg_subscriptors SET pickup_days = $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE sup_id = $2`,
      [JSON.stringify(pickup_days), sup_id]
    );

    // 4. Create ESG Task
    // 4. Create ESG Task
    // Get current time in Bangkok (UTC+7)
    const bangkokNow = getBangkokTime();

    const nowDay = bangkokNow.getDate();
    const nowMonth = bangkokNow.getMonth();
    const nowYear = bangkokNow.getFullYear();
    const targetDay = parseInt(date);

    let taskYear = nowYear;
    let taskMonth = nowMonth;
    if (targetDay < nowDay) {
      taskMonth += 1;
    }

    // Setting task time to 08:00 nominal time for the database
    let taskDate = new Date(taskYear, taskMonth, targetDay, 8, 0, 0);

    await client.query(
      `INSERT INTO esg_tasks (esg_subscriptor_id, esg_driver_id, date, status, chat_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [sup_id, esg_driver_id, taskDate, 'waiting', chatId]
    );

    // 5. Update Driver Table (Mark is_accept = true)
    const dDayIdx = dPickupDays.findIndex(d => d && d.date === parseInt(date));
    if (dDayIdx !== -1) {
      const contractIdx = dPickupDays[dDayIdx].contract_user.findIndex(c => c.id == sup_id);
      if (contractIdx !== -1) {
        dPickupDays[dDayIdx].contract_user[contractIdx].is_accept = true;
        await client.query(
          `UPDATE esg_driver SET pickup_days = $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE user_id = $2`,
          [JSON.stringify(dPickupDays), internal_driver_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, pickup_days });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /esg/confirm-driver:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get next upcoming task for driver
app.get('/esg/tasks/driver/next', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get the driver's ESG ID
    const driverRes = await pool.query('SELECT driver_id FROM esg_driver WHERE user_id = $1', [user_id]);
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    const esg_driver_id = driverRes.rows[0].driver_id;

    const result = await pool.query(
      `SELECT t.*, u.full_name as user_name, u.avatar_url as user_avatar,
              a.address as pickup_address, a.phone as pickup_phone,
              s.package_name
       FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       JOIN users u ON s.user_id = u.id
       JOIN addresses a ON s.address_id = a.id
       WHERE t.esg_driver_id = $1 
         AND (t.date AT TIME ZONE 'Asia/Bangkok')::date > (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date
       ORDER BY t.date ASC`,
      [esg_driver_id]
    );

    console.log(`[NextTask] Found ${result.rows.length} tasks for driver ${esg_driver_id}`);
    result.rows.forEach(r => console.log(` - Task ${r.tasks_id} on ${r.date} (${r.status})`));

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error in /esg/tasks/driver/next:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get today's tasks for driver
app.get('/esg/tasks/driver/today', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // 1. Get ESG Driver ID
    const driverRes = await pool.query(
      'SELECT driver_id FROM esg_driver WHERE user_id = $1',
      [user_id]
    );

    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const esg_driver_id = driverRes.rows[0].driver_id;

    const result = await pool.query(
      `SELECT t.*, u.full_name as user_name, u.avatar_url as user_avatar,
              a.address as pickup_address, a.phone as pickup_phone,
              s.package_name
       FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       JOIN users u ON s.user_id = u.id
       JOIN addresses a ON s.address_id = a.id
       WHERE t.esg_driver_id = $1 
         AND (
           (t.date AT TIME ZONE 'Asia/Bangkok')::date = (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date
           OR (t.status IN ('waiting', 'pending') AND (t.date AT TIME ZONE 'Asia/Bangkok')::date < (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date)
         )
         AND t.status != 'skipped'
       ORDER BY t.date ASC`,
      [esg_driver_id]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error in /esg/tasks/driver/today:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/tasks/history', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    // 1. Get sup_id for this user
    const subRes = await pool.query(
      'SELECT sup_id FROM esg_subscriptors WHERE user_id = $1 AND is_active = true LIMIT 1',
      [user_id]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Active subscription not found' });
    }
    const sup_id = subRes.rows[0].sup_id;

    // 2. Fetch all tasks where date <= today
    const taskRes = await pool.query(
      `SELECT t.*, u.full_name as driver_name, u.avatar_url as driver_avatar, ed.driver_id as esg_driver_id, u.id as driver_user_id,
              ra.label as factory_name
       FROM esg_tasks t
       LEFT JOIN esg_driver ed ON t.esg_driver_id = ed.driver_id
       LEFT JOIN users u ON ed.user_id = u.id
       LEFT JOIN recycling_addresses ra ON NULLIF(t.recycling_center_addresss_id, '') IS NOT NULL AND ra.address_id = t.recycling_center_addresss_id
       WHERE t.esg_subscriptor_id = $1 
         AND (t.date AT TIME ZONE 'Asia/Bangkok')::date <= (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date
       ORDER BY t.date DESC`,
      [sup_id]
    );

    res.json({ tasks: taskRes.rows });
  } catch (error) {
    console.error('Error fetching ESG task history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/tasks/driver/history', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    // 1. Get driver_id for this user
    const driverRes = await pool.query(
      'SELECT driver_id FROM esg_driver WHERE user_id = $1 LIMIT 1',
      [user_id]
    );
    if (driverRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    const driver_id = driverRes.rows[0].driver_id;

    // 2. Fetch all tasks where date <= today
    const taskRes = await pool.query(
      `SELECT t.*, u.full_name as user_name, u.avatar_url as user_avatar,
              a.address as pickup_address, a.phone as pickup_phone
       FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       JOIN users u ON s.user_id = u.id
       JOIN addresses a ON s.address_id = a.id
       WHERE t.esg_driver_id = $1 
         AND (t.date AT TIME ZONE 'Asia/Bangkok')::date <= (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date
       ORDER BY t.date DESC`,
      [driver_id]
    );

    res.json({ tasks: taskRes.rows });
  } catch (error) {
    console.error('Error fetching ESG driver task history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/tasks/nearest', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    // 1. Get sup_id and package_name for this user
    const subRes = await pool.query(
      'SELECT sup_id, package_name FROM esg_subscriptors WHERE user_id = $1 AND is_active = true LIMIT 1',
      [user_id]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Active subscription not found' });
    }
    const { sup_id, package_name } = subRes.rows[0];

    const { upcomingOnly } = req.query;
    let statusFilter = "t.status NOT IN ('skipped')";
    if (upcomingOnly === 'true') {
      statusFilter = "t.status NOT IN ('skipped', 'completed', 'complete')";
    }

    // 2. Find nearest task
    const taskRes = await pool.query(
      `SELECT t.*, u.full_name as driver_name, u.avatar_url as driver_avatar, ed.driver_id as esg_driver_id, u.id as driver_user_id,
              ra.label as factory_name, ra.address as factory_address,
              ra.lat as factory_lat, ra.lng as factory_lng, ra.phone as factory_phone
       FROM esg_tasks t
       LEFT JOIN esg_driver ed ON t.esg_driver_id = ed.driver_id
       LEFT JOIN users u ON ed.user_id = u.id
       LEFT JOIN recycling_addresses ra ON t.recycling_center_addresss_id = ra.address_id
       WHERE t.esg_subscriptor_id = $1 
         AND ${statusFilter}
         AND (t.date AT TIME ZONE 'Asia/Bangkok')::date >= (timezone('Asia/Bangkok', CURRENT_TIMESTAMP))::date - INTERVAL '6 hours'
       ORDER BY t.date ASC LIMIT 1`,
      [sup_id]
    );

    res.json({
      task: taskRes.rows[0] || null,
      package_name: package_name // Direct from subscriptor table
    });
  } catch (error) {
    console.error('Error fetching nearest ESG task:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/esg/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, 
              u_sub.full_name as user_name, u_sub.avatar_url as user_avatar,
              a.address as pickup_address, a.phone as pickup_phone,
              a.lat as pickup_lat, a.lng as pickup_lng,
              s.package_name,
              ra.label as factory_name, ra.address as factory_address,
              ra.lat as factory_lat, ra.lng as factory_lng, ra.phone as factory_phone,
              ra.note as factory_note, ra.images as factory_images,
              u_drv.full_name as driver_name, u_drv.avatar_url as driver_avatar,
              ed.driver_id as esg_driver_id, u_drv.id as driver_user_id
       FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       JOIN users u_sub ON s.user_id = u_sub.id
       JOIN addresses a ON s.address_id = a.id
       LEFT JOIN recycling_addresses ra ON t.recycling_center_addresss_id = ra.address_id
       LEFT JOIN esg_driver ed ON t.esg_driver_id = ed.driver_id
       LEFT JOIN users u_drv ON ed.user_id = u_drv.id
       WHERE t.tasks_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ESG task by ID:', error);
    res.status(500).json({ error: error.message });
  }
});



app.post('/esg/tasks/:id/complete', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { weight, carbon_reduce, tree_equivalent, recycling_center_addresss_id } = req.body;

    await client.query('BEGIN');

    // 1. Update task: status to pending, date to NOW (real time), weight, carbon_reduce, tree_equivalent, factory ID
    const updateTaskQuery = `
      UPDATE esg_tasks 
      SET 
        status = 'pending',
        weight = $1,
        carbon_reduce = $2,
        tree_equivalent = $3,
        recycling_center_addresss_id = $4,
        complete_time = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
      WHERE tasks_id = $5
      RETURNING *
    `;
    const taskRes = await client.query(updateTaskQuery, [
      JSON.stringify(weight),
      carbon_reduce,
      tree_equivalent || 0,
      recycling_center_addresss_id,
      id
    ]);

    if (taskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    // 2. Update Driver's accumulated weight
    const totalWeight = weight.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
    const driverId = taskRes.rows[0].esg_driver_id;

    await client.query(
      `UPDATE esg_driver SET weight_accumulate = weight_accumulate + $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) WHERE driver_id = $2`,
      [totalWeight, driverId]
    );

    // 3. Update ESG Factors for Subscriber
    const esg_subscriptor_id = taskRes.rows[0].esg_subscriptor_id;
    if (Array.isArray(weight)) {
      for (const item of weight) {
        // The driver app sends Thai names, e.g., 'กระดาษ'
        // Map them to the English columns in esg_factors
        const materialTypeMap = {
          'กระดาษ': 'paper',
          'พลาสติก': 'plastic',
          'โลหะและอลูมิเนียม': 'metal',
          'แก้ว': 'glass'
        };

        const mappedType = materialTypeMap[item.type] || (item.type && item.type.toLowerCase());
        const materialWeight = parseFloat(item.weight || 0);

        if (['paper', 'plastic', 'metal', 'glass'].includes(mappedType) && materialWeight > 0) {
          await client.query(
            `UPDATE esg_factors 
             SET ${mappedType} = ${mappedType} + $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) 
             WHERE sub_id = $2`,
            [materialWeight, esg_subscriptor_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, task: taskRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing ESG task:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
app.post('/esg/tasks/:id/finalize', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { evidences_images, receipt_images } = req.body;

    // Check minimum requirements
    if (!evidences_images || evidences_images.length < 3) {
      return res.status(400).json({ error: 'Require at least 3 evidence images' });
    }
    if (!receipt_images || receipt_images.length < 1) {
      return res.status(400).json({ error: 'Require at least 1 receipt image' });
    }

    await client.query('BEGIN');

    // 1. Fetch Task and Subscriber Info
    const taskRes = await client.query(
      `SELECT t.*, s.package_name, s.sup_id 
       FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       WHERE t.tasks_id = $1`,
      [id]
    );

    if (taskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes.rows[0];
    const { esg_driver_id, esg_subscriptor_id, weight, date, package_name, chat_id } = task;

    const coinsEarned = package_name?.toLowerCase().includes('enterprise') ? 20 : 10;

    // Parse weight properly as it is stored as JSON string in the db
    let weightArray = Array.isArray(weight) ? weight : [];
    if (typeof weight === 'string') {
      try {
        weightArray = JSON.parse(weight);
      } catch (e) {
        console.warn("Could not parse weight string", e);
      }
    }

    const totalWeight = weightArray.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);

    // 3. Process and Upload Images to Minio
    const uploadedEvidenceUrls = [];
    if (evidences_images && Array.isArray(evidences_images)) {
      for (let i = 0; i < evidences_images.length; i++) {
        const base64Data = evidences_images[i];
        if (base64Data.startsWith('http')) {
          uploadedEvidenceUrls.push(base64Data);
          continue;
        }
        const base64Image = base64Data.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `esg_tasks/evidences/${id}_${Date.now()}_${i}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
        uploadedEvidenceUrls.push(imageUrl);
      }
    }

    const uploadedReceiptUrls = [];
    if (receipt_images && Array.isArray(receipt_images)) {
      for (let i = 0; i < receipt_images.length; i++) {
        const base64Data = receipt_images[i];
        if (base64Data.startsWith('http')) {
          uploadedReceiptUrls.push(base64Data);
          continue;
        }
        const base64Image = base64Data.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `esg_tasks/receipts/${id}_${Date.now()}_${i}.jpg`;

        await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
          'Content-Type': 'image/jpeg'
        });

        const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
        uploadedReceiptUrls.push(imageUrl);
      }
    }

    // 4. Update Current Task
    await client.query(
      `UPDATE esg_tasks 
       SET 
         status = 'completed',
         evidences_images = $1,
         receipt_images = $2,
         complete_time = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       WHERE tasks_id = $3`,
      [uploadedEvidenceUrls, uploadedReceiptUrls, id]
    );

    // 4. Update Driver Rewards
    await client.query(
      `UPDATE esg_driver 
       SET 
         coin = coin + $1, 
         weight_accumulate = weight_accumulate + $2, 
         updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) 
       WHERE driver_id = $3`,
      [coinsEarned, totalWeight, esg_driver_id]
    );

    // 5. Update ESG Factors for Subscriber
    if (Array.isArray(weightArray)) {
      for (const item of weightArray) {
        const materialType = item.type?.toLowerCase(); // paper, plastic, metal, glass
        const materialWeight = parseFloat(item.weight || 0);

        if (['paper', 'plastic', 'metal', 'glass'].includes(materialType) && materialWeight > 0) {
          await client.query(
            `UPDATE esg_factors 
             SET ${materialType} = ${materialType} + $1, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP) 
             WHERE sub_id = $2`,
            [materialWeight, esg_subscriptor_id]
          );
        }
      }
    }

    // 6. Schedule Next Month's Task
    const currentTaskDate = new Date(date);
    const nextMonthDate = new Date(currentTaskDate);
    nextMonthDate.setMonth(currentTaskDate.getMonth() + 1);

    await client.query(
      `INSERT INTO esg_tasks (esg_subscriptor_id, esg_driver_id, date, status, chat_id) 
       VALUES ($1, $2, $3, 'waiting', $4)`,
      [esg_subscriptor_id, esg_driver_id, nextMonthDate, chat_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      coinsEarned,
      totalWeight,
      status: 'completed'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error finalizing ESG task:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.patch('/esg/tasks/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.user_id;

    // Verify ownership (join through subscriptor)
    const verifyRes = await pool.query(
      `SELECT t.tasks_id FROM esg_tasks t
       JOIN esg_subscriptors s ON t.esg_subscriptor_id = s.sup_id
       WHERE t.tasks_id = $1 AND s.user_id = $2`,
      [id, user_id]
    );

    if (verifyRes.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied or task not found' });
    }

    await pool.query(
      `UPDATE esg_tasks SET status = $1, complete_time = CASE WHEN $1 = 'complete' THEN timezone('Asia/Bangkok', CURRENT_TIMESTAMP) ELSE complete_time END WHERE tasks_id = $2`,
      [status, id]
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error updating ESG task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recycling Addresses CRUD
app.get('/recycling-addresses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recycling_addresses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recycling addresses:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/recycling-addresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM recycling_addresses WHERE address_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recycling address not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching recycling address:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FACTORY IMAGE UPLOAD
// ============================================
app.post('/upload/factory-image', adminAuthMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const file = req.files.image;
    const fileName = `recycling-factories/${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;

    await minioClient.putObject(BUCKET_NAME, fileName, file.data, file.size, {
      'Content-Type': file.mimetype
    });

    const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/recycling-addresses', adminAuthMiddleware, async (req, res) => {
  try {
    let { address_id, label, address, lat, lng, phone, note, province, district, images } = req.body;

    // Auto-generate ID if not provided
    if (!address_id) {
      address_id = `FACTORY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const result = await pool.query(
      `INSERT INTO recycling_addresses (address_id, label, address, lat, lng, phone, note, province, district, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [address_id, label, address, lat, lng, phone, note, province, district, images || []]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recycling address:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/recycling-addresses/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng, phone, note, province, district, images } = req.body;
    const result = await pool.query(
      `UPDATE recycling_addresses 
       SET label = $1, address = $2, lat = $3, lng = $4, phone = $5, note = $6, province = $7, district = $8, images = $9, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       WHERE address_id = $10
       RETURNING *`,
      [label, address, lat, lng, phone, note, province, district, images || [], id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recycling address not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recycling address:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/recycling-addresses/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recycling_addresses WHERE address_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recycling address not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recycling address:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trash Bin Addresses CRUD
app.get('/trash-bin-addresses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trash_bin_addresses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trash bin addresses:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/trash-bin-addresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM trash_bin_addresses WHERE address_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trash bin address not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching trash bin address:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload/trash-bin-image', adminAuthMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const file = req.files.image;
    const fileName = `trash-bins/${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;

    await minioClient.putObject(BUCKET_NAME, fileName, file.data, file.size, {
      'Content-Type': file.mimetype
    });

    const imageUrl = `${MINIO_PUBLIC_URL}/${BUCKET_NAME}/${fileName}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/trash-bin-addresses', adminAuthMiddleware, async (req, res) => {
  try {
    let { address_id, label, address, lat, lng, note, province, district, images } = req.body;

    if (!address_id) {
      address_id = `BIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const result = await pool.query(
      `INSERT INTO trash_bin_addresses (address_id, label, address, lat, lng, note, province, district, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [address_id, label, address, lat, lng, note, province, district, images || []]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating trash bin address:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/trash-bin-addresses/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng, note, province, district, images } = req.body;
    const result = await pool.query(
      `UPDATE trash_bin_addresses 
       SET label = $1, address = $2, lat = $3, lng = $4, note = $5, province = $6, district = $7, images = $8, updated_at = timezone('Asia/Bangkok', CURRENT_TIMESTAMP)
       WHERE address_id = $9
       RETURNING *`,
      [label, address, lat, lng, note, province, district, images || [], id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trash bin address not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trash bin address:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/trash-bin-addresses/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM trash_bin_addresses WHERE address_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trash bin address not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting trash bin address:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /esg/user/stats
 * Returns monthly carbon reduction and material factors for the user
 */
app.get('/esg/user/stats', authMiddleware, async (req, res) => {
  const userId = req.user.user_id;
  const client = await pool.connect();
  try {
    // 1. Get subscriptor_id and created_at for the user
    const subRes = await client.query('SELECT sup_id, created_at FROM esg_subscriptors WHERE user_id = $1 AND is_active = true', [userId]);
    if (subRes.rows.length === 0) {
      return res.json({ history: [], factors: null, subscription_date: null });
    }
    const supId = subRes.rows[0].sup_id;
    const subscriptionDate = subRes.rows[0].created_at;

    // 2. Aggregate carbon_reduce by month
    const historyRes = await client.query(`
      SELECT 
        to_char(date_trunc('month', date AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM') as month,
        SUM(COALESCE(carbon_reduce, 0))::numeric as carbon
      FROM esg_tasks 
      WHERE esg_subscriptor_id = $1 AND status = 'completed'
      GROUP BY month
      ORDER BY month ASC
    `, [supId]);

    // 3. Get material factors
    const factorsRes = await client.query(`
      SELECT paper, plastic, metal, glass 
      FROM esg_factors 
      WHERE sub_id = $1
    `, [supId]);

    // 4. Get additional metrics for 56-1 Report
    const totalTasksRes = await client.query('SELECT COUNT(*) as count FROM esg_tasks WHERE esg_subscriptor_id = $1', [supId]);

    const subDaysRes = await client.query('SELECT pickup_days FROM esg_subscriptors WHERE sup_id = $1', [supId]);
    const pickupDays = subDaysRes.rows[0]?.pickup_days || [];

    const uniqueDriversSet = new Set();
    if (Array.isArray(pickupDays)) {
      pickupDays.forEach(day => {
        if (day && day.confirmed_driver_id) {
          uniqueDriversSet.add(day.confirmed_driver_id);
        }
      });
    }
    const uniqueDrivers = Array.from(uniqueDriversSet);

    let representativeDriverCoin = 0;
    if (uniqueDrivers.length > 0) {
      const driverRes = await client.query('SELECT coin FROM esg_driver WHERE driver_id = $1', [uniqueDrivers[0]]);
      if (driverRes.rows.length > 0) {
        representativeDriverCoin = parseFloat(driverRes.rows[0].coin || 0);
      }
    }

    res.json({
      history: historyRes.rows,
      factors: factorsRes.rows[0] || { paper: 0, plastic: 0, metal: 0, glass: 0 },
      subscription_date: subscriptionDate,
      total_tasks_count: parseInt(totalTasksRes.rows[0].count),
      unique_drivers_count: uniqueDrivers.length,
      representative_driver_coin: representativeDriverCoin
    });
  } catch (err) {
    console.error('Error fetching user ESG stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

