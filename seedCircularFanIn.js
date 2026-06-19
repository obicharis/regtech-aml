require('dotenv').config();
const fs = require('fs');
const { getSession, closeDriver } = require('./db');

async function seedCircularFanIn() {
  const raw = fs.readFileSync('./data/circularFanIn.json', 'utf-8');
  const data = JSON.parse(raw);
  const session = getSession();

  try {
    for (const p of data.persons) {
      await session.run(
        `MERGE (n:Person {id: $id})
         SET n.name = $name, n.nationality = $nationality,
             n.dob = $dob, n.pep_status = $pep_status, n.risk_tier = $risk_tier`,
        p
      );
    }
    console.log(`Loaded ${data.persons.length} Person node(s)`);

    for (const a of data.accounts) {
      await session.run(
        `MERGE (acc:Account {id: $id})
         SET acc.account_number = $account_number, acc.bank_name = $bank_name,
             acc.jurisdiction = $jurisdiction, acc.currency = $currency,
             acc.opened_date = $opened_date`,
        a
      );
      await session.run(
        `MATCH (holder {id: $holder_id}), (acc:Account {id: $id})
         MERGE (holder)-[:HOLDS_ACCOUNT]->(acc)`,
        a
      );
    }
    console.log(`Loaded ${data.accounts.length} Account node(s) + HOLDS_ACCOUNT edges`);

    for (const t of data.transactions) {
      await session.run(
        `MERGE (tx:Transaction {id: $id})
         SET tx.amount = $amount, tx.currency = $currency, tx.timestamp = $timestamp,
             tx.transaction_type = $transaction_type, tx.value_date = $value_date,
             tx.settlement_date = $settlement_date
         WITH tx
         MATCH (src:Account {id: $from_account}), (dst:Account {id: $to_account})
         MERGE (src)-[:SENT]->(tx)
         MERGE (tx)-[:RECEIVED]->(dst)`,
        t
      );
    }
    console.log(`Loaded ${data.transactions.length} Transaction node(s) + SENT/RECEIVED edges`);

    console.log('Circular/fan-in pattern seeded successfully.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedCircularFanIn();
