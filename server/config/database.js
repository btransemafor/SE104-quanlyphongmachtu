const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');


//dotenv.config({ path: path.join(__dirname, '../../config.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
/*   ssl: {
    require: true,
    rejectUnauthorized: false, // bỏ qua chứng chỉ self-signed
  }, */
  max: 20,
/*   idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, */
});



pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
