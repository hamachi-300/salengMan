
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(':5432/', ':5433/'),
});

async function checkUsers() {
  try {
    const result = await pool.query("SELECT id, email, full_name, role FROM users WHERE role = 'admin'");
    console.log('Admin Users:', JSON.stringify(result.rows, null, 2));
    
    const allRoles = await pool.query("SELECT DISTINCT role FROM users");
    console.log('Available Roles:', JSON.stringify(allRoles.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
