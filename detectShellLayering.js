require('dotenv').config();
const { getSession, closeDriver } = require('./db');

async function detectShellLayering() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH path = (root)-[:OWNS*3..]->(dest:Company)
      WHERE NOT (root)<-[:OWNS]-()
      WITH root, path, dest, length(path) AS hops,
           [n IN nodes(path) WHERE n:Company] AS companies
      WITH root, path, dest, hops, companies,
           [c IN companies WHERE c.entity_type = "shell"] AS shellNodes
      WHERE size(shellNodes) >= 2
      WITH root, collect({path: path, dest: dest, hops: hops, companies: companies, shellNodes: shellNodes}) AS candidates
      WITH root, candidates, apoc.coll.max([c IN candidates | c.hops]) AS maxHops
      WITH root, [c IN candidates WHERE c.hops = maxHops][0] AS best
      RETURN
        root.name AS originName,
        best.dest.name AS destinationName,
        best.hops AS hops,
        size(best.shellNodes) AS shellCount,
        [c IN best.companies | c.name] AS chainNames,
        [c IN best.companies | c.jurisdiction] AS jurisdictions,
        ROUND(100.0 * size(best.shellNodes) / size(best.companies)) AS riskScore
      ORDER BY riskScore DESC
    `);

    if (result.records.length === 0) {
      console.log('No shell layering chains detected.');
    } else {
      result.records.forEach(r => {
        console.log('--- FLAGGED ---');
        console.log('Origin:', r.get('originName'));
        console.log('Destination:', r.get('destinationName'));
        console.log('Hops:', r.get('hops').toNumber ? r.get('hops').toNumber() : r.get('hops'));
        console.log('Shell count:', r.get('shellCount'));
        console.log('Chain:', r.get('chainNames').join(' -> '));
        console.log('Jurisdictions:', r.get('jurisdictions').join(' -> '));
        console.log('Risk score:', r.get('riskScore'), '%');
      });
    }
  } catch (err) {
    console.error('Detection query failed:', err.message);
  } finally {
    await session.close();
    await closeDriver();
  }
}

detectShellLayering();
