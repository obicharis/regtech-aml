require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function verifyConnection() {
  try {
    await driver.verifyConnectivity();
    console.log('Connected to Neo4j AuraDB successfully');
    return true;
  } catch (err) {
    console.error('Failed to connect to Neo4j:', err.message);
    return false;
  }
}

function getSession() {
  return driver.session();
}

async function closeDriver() {
  await driver.close();
}

module.exports = { driver, getSession, verifyConnection, closeDriver };
