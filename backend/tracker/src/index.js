require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const POLL_INTERVAL = (process.env.POLL_INTERVAL_SECONDS || 10) * 1000;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);

function loadChains() {
  const file = process.env.CHAINS_JSON_FILE || path.join(process.cwd(), '..', '..', 'infra', 'chains.json');
  if (file && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file));
  }
  if (process.env.CHAINS) return JSON.parse(process.env.CHAINS);
  throw new Error('No chains configuration found. Set CHAINS_JSON_FILE or CHAINS env var.');
}

const CHAINS = loadChains();
const db = new Client({ connectionString: DATABASE_URL });

async function initDb() {
  await db.connect();
  await db.query(`
    CREATE TABLE IF NOT EXISTS tracker_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

async function getLastProcessedBlock(chainName) {
  const key = `last_processed_block:${chainName}`;
  const r = await db.query('SELECT value FROM tracker_state WHERE key=$1', [key]);
  if (r.rowCount === 0) return null;
  return parseInt(r.rows[0].value, 10);
}
async function setLastProcessedBlock(chainName, n) {
  const key = `last_processed_block:${chainName}`;
  await db.query(`
    INSERT INTO tracker_state(key,value) VALUES($1,$2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `, [key, String(n)]);
}

function loadAbiFor(address, abiDir) {
  const normalized = address.toLowerCase();
  const fileA = path.join(abiDir, `${normalized}.json`);
  if (fs.existsSync(fileA)) {
    return JSON.parse(fs.readFileSync(fileA));
  }
  return [
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];
}

async function saveEvent(parsed) {
  const { chain, txHash, blockNumber, contractAddress, name, signature, args, raw, timestamp } = parsed;
  await db.query(
    `INSERT INTO events (chain, tx_hash, block_number, contract_address, event_name, event_signature, event_args, event_raw, timestamp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
    [chain, txHash, blockNumber, contractAddress, name, signature, JSON.stringify(args), JSON.stringify(raw), timestamp]
  );
}

async function processRangeForChain(chainConfig, fromBlock, toBlock) {
  const provider = chainConfig._provider;
  const tracked = chainConfig.trackedContracts || [];
  if (!tracked.length) return;
  console.log(`[${chainConfig.name}] scanning ${fromBlock} → ${toBlock} for ${tracked.length} contracts`);
  for (const address of tracked) {
    try {
      const filter = { address, fromBlock, toBlock };
      const logs = await provider.getLogs(filter);
      if (!logs || logs.length === 0) continue;
      const abi = loadAbiFor(address, chainConfig.abiDir || './abis');
      const iface = new ethers.utils.Interface(abi);
      for (const log of logs) {
        let parsed = null;
        try { parsed = iface.parseLog(log); } catch(e) {}
        const block = await provider.getBlock(log.blockNumber);
        const ts = block ? new Date(block.timestamp * 1000) : null;
        const ev = {
          chain: chainConfig.name,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          contractAddress: log.address,
          name: parsed ? parsed.name : 'unknown',
          signature: parsed ? parsed.signature : null,
          args: parsed ? parsed.args : null,
          raw: { topics: log.topics, data: log.data },
          timestamp: ts
        };
        await saveEvent(ev);
        console.log(`[${chainConfig.name}] saved ${ev.name} tx=${ev.txHash} block=${ev.blockNumber}`);
      }
    } catch (err) {
      console.error(`[${chainConfig.name}] error processing ${address} logs:`, err.message);
    }
  }
}

async function startChainWorker(chainConfig) {
  chainConfig._provider = new ethers.providers.JsonRpcProvider(chainConfig.rpc);
  let last = await getLastProcessedBlock(chainConfig.name);
  if (last === null) {
    const current = await chainConfig._provider.getBlockNumber();
    last = current - 1;
    await setLastProcessedBlock(chainConfig.name, last);
    console.log(`[${chainConfig.name}] init last_processed_block=${last}`);
  }
  (async function loop() {
    while (true) {
      try {
        const lastBlock = await getLastProcessedBlock(chainConfig.name);
        const current = await chainConfig._provider.getBlockNumber();
        if (current > lastBlock) {
          const to = Math.min(lastBlock + BATCH_SIZE, current);
          await processRangeForChain(chainConfig, lastBlock + 1, to);
          await setLastProcessedBlock(chainConfig.name, to);
        }
      } catch (err) {
        console.error(`[${chainConfig.name}] polling error:`, err.message);
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
  })();
}

async function main() {
  await initDb();
  console.log('DB ready');
  const chains = CHAINS.map(c => ({
    ...c,
    trackedContracts: (c.trackedContracts || []).map(a => a.toLowerCase()),
    abiDir: path.resolve(process.cwd(), c.abiDir || './abis')
  }));
  for (const c of chains) {
    startChainWorker(c).catch(e => console.error(`Worker ${c.name} failed:`, e.message));
  }
}

main().catch(err => { console.error('Fatal error', err); process.exit(1); });
