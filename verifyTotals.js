require('dotenv').config();
const { getSession, closeDriver } = require('./db');

async function verify() {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n) RETURN labels(n)[0] AS label, count(*) AS count ORDER BY label`
    );
    result.records.forEach(r => {
      console.log(`${r.get('label')}: ${r.get('count').toNumber()}`);
    });
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

verify();
