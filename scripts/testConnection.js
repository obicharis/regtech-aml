const { verifyConnection, closeDriver } = require('../db');

(async () => {
  console.log('Testing connection to Neo4j AuraDB...');
  const ok = await verifyConnection();
  await closeDriver();
  process.exit(ok ? 0 : 1);
})();
