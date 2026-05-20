const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing connection to:', connectionString.replace(/:([^:@]+)@/, ':****@')); // Hide password

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    console.error('Error code:', err.code);
  }
}

testConnection();
