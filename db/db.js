const pg = require('pg');
require('dotenv').config();

exports.pool = pg.Pool ({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});