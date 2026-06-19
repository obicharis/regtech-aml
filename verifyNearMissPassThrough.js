require('dotenv').config();
const { getSession, closeDriver } = require('./db');

async function verify() {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a:Account)-[:SENT]->(t1:Transaction)-[:RECEIVED]->(b:Account)-[:SENT]->(t2:Transaction)-[:RECEIVED]->(c:Account)
       WHERE a.id = "A021"
       RETURN a.jurisdiction AS fromJur, t1.amount AS amt1, b.jurisdiction AS midJur, t2.amount AS amt2, c.jurisdiction AS toJur`
    );
    result.records.forEach(r => {
      console.log(`${r.get('fromJur')} ($${r.get('amt1')}) -> ${r.get('midJur')} ($${r.get('amt2')}) -> ${r.get('toJur')}`);
    });
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

verify();
