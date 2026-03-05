const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

async function migrate() {
  try {
    console.log('Adding chat_id column to esg_tasks...');
    await pool.query('ALTER TABLE esg_tasks ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id);');
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
