const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        console.log('Users table columns:', res.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        pool.end();
    }
}

checkSchema();
