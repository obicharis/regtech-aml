const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

router.get('/shell-layering', async (req, res) => {
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
    const flags = result.records.map(r => ({
      pattern: 'shell_layering',
      origin: r.get('originName'),
      destination: r.get('destinationName'),
      hops: r.get('hops').toNumber ? r.get('hops').toNumber() : r.get('hops'),
      shellCount: r.get('shellCount'),
      chain: r.get('chainNames'),
      jurisdictions: r.get('jurisdictions'),
      riskScore: r.get('riskScore'),
      reasoning: `Ownership chain of ${r.get('hops')} hops where ${r.get('shellCount')} of ${r.get('chainNames').length} entities are flagged shell companies.`
    }));
    res.json({ count: flags.length, flags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.get('/circular-fan-in', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (hub:Account)<-[:RECEIVED]-(tx:Transaction)<-[:SENT]-(feeder:Account)
      WITH hub, collect(DISTINCT feeder) AS feeders, count(DISTINCT tx) AS inboundCount
      WHERE inboundCount >= 4
      MATCH (hub)-[:SENT]->(loopTx:Transaction)-[:RECEIVED]->(loopBack:Account)
      WHERE loopBack IN feeders
      WITH hub, feeders, inboundCount, collect(DISTINCT loopBack) AS loopAccounts
      RETURN
        hub.account_number AS hubAccount,
        inboundCount AS feederTransactions,
        size(feeders) AS uniqueFeeders,
        [f IN feeders | f.account_number] AS feederAccounts,
        [l IN loopAccounts | l.account_number] AS loopedBackTo
      ORDER BY uniqueFeeders DESC
    `);
    const flags = result.records.map(r => ({
      pattern: 'circular_fan_in',
      hubAccount: r.get('hubAccount'),
      feederTransactions: r.get('feederTransactions').toNumber ? r.get('feederTransactions').toNumber() : r.get('feederTransactions'),
      uniqueFeeders: r.get('uniqueFeeders'),
      feederAccounts: r.get('feederAccounts'),
      loopedBackTo: r.get('loopedBackTo'),
      reasoning: `Account received from ${r.get('uniqueFeeders')} distinct accounts and sent funds back to ${r.get('loopedBackTo').length} of them, forming a closed loop.`
    }));
    res.json({ count: flags.length, flags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.get('/rapid-pass-through', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (a:Account)-[:SENT]->(t1:Transaction)-[:RECEIVED]->(b:Account)-[:SENT]->(t2:Transaction)-[:RECEIVED]->(c:Account)-[:SENT]->(t3:Transaction)-[:RECEIVED]->(d:Account)
      WHERE t1.value_date = t1.settlement_date
        AND t2.value_date = t2.settlement_date
        AND t3.value_date = t3.settlement_date
      MATCH (holderB) WHERE (holderB)-[:HOLDS_ACCOUNT]->(b)
      MATCH (holderC) WHERE (holderC)-[:HOLDS_ACCOUNT]->(c)
      WITH a, b, c, d, t1, t2, t3, holderB, holderC
      WHERE holderB.entity_type = "shell" OR holderC.entity_type = "shell"
      RETURN
        a.account_number AS origin,
        b.account_number AS hop1,
        c.account_number AS hop2,
        d.account_number AS destination,
        t1.amount AS amt1, t2.amount AS amt2, t3.amount AS amt3,
        holderB.name AS holderBName, holderC.name AS holderCName,
        holderB.entity_type AS holderBType, holderC.entity_type AS holderCType
    `);
    const flags = result.records.map(r => ({
      pattern: 'rapid_pass_through',
      origin: r.get('origin'),
      hop1: r.get('hop1'),
      hop2: r.get('hop2'),
      destination: r.get('destination'),
      amounts: [r.get('amt1'), r.get('amt2'), r.get('amt3')],
      reasoning: `All hops settled same-day with at least one intermediate account (${r.get('holderBType') === 'shell' ? r.get('holderBName') : r.get('holderCName')}) held by a flagged shell entity.`
    }));
    res.json({ count: flags.length, flags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
