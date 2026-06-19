require('dotenv').config();
const { getSession, closeDriver } = require('./db');

async function verify() {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (src:Account)-[:SENT]->(tx:Transaction)-[:RECEIVED]->(dst:Account {id: "A020"})
       RETURN src.account_number AS source, tx.amount AS amount, tx.timestamp AS time
       ORDER BY tx.timestamp`
    );
    result.records.forEach(r => {
      console.log(`${r.get('source')} -> A020 : $${r.get('amount')} at ${r.get('time')}`);
    });

    const loopCheck = await session.run(
      `MATCH (a:Account {id: "A020"})-[:SENT]->(:Transaction)-[:RECEIVED]->(:Account)
       RETURN count(*) AS outgoing`
    );
    console.log('Outgoing transactions from A020 (should be 0):', loopCheck.records[0].get('outgoing').toNumber());
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

verify();
