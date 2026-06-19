require('dotenv').config();
const fs = require('fs');
const { getSession, closeDriver } = require('./db');

async function seedShellLayering() {
  const raw = fs.readFileSync('./data/shellLayering.json', 'utf-8');
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

    for (const c of data.companies) {
      await session.run(
        `MERGE (n:Company {id: $id})
         SET n.name = $name, n.jurisdiction = $jurisdiction,
             n.incorporation_date = $incorporation_date,
             n.entity_type = $entity_type, n.risk_tier = $risk_tier`,
        c
      );
    }
    console.log(`Loaded ${data.companies.length} Company node(s)`);

    for (const e of data.ownership_edges) {
      await session.run(
        `MATCH (a {id: $from}), (b {id: $to})
         MERGE (a)-[r:OWNS]->(b)
         SET r.ownership_pct = $ownership_pct, r.start_date = $start_date`,
        e
      );
    }
    console.log(`Loaded ${data.ownership_edges.length} OWNS edge(s)`);

    console.log('Shell layering pattern seeded successfully.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedShellLayering();
