const pool = require('./src/config/database');

console.log('Pool type:', typeof pool);
console.log('Pool methods:', Object.getOwnPropertyNames(pool));
console.log('Pool has query:', typeof pool.query);

async function testQuery() {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('Query result:', result);
  } catch (error) {
    console.error('Query error:', error);
  }
}

testQuery();
