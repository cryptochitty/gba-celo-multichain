require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(cors());
app.use(express.json());

let chainMeta = {};
try {
  const f = process.env.CHAINS_JSON_FILE || path.join(process.cwd(),'../..','infra','chains.json');
  if (fs.existsSync(f)) {
    const arr = JSON.parse(fs.readFileSync(f));
    arr.forEach(c => { chainMeta[c.name] = c; });
  }
} catch (e) { console.warn('Could not load chain meta file', e.message); }

app.get('/events', async (req, res) => {
  const { limit = 50, contract, address, event, page = 0, chain } = req.query;
  const params = []; const where = [];
  if (chain) { params.push(chain); where.push(`chain = $${params.length}`); }
  if (contract) { params.push(contract.toLowerCase()); where.push(`contract_address = $${params.length}`); }
  if (event) { params.push(event); where.push(`event_name = $${params.length}`); }
  if (address) { params.push(address.toLowerCase()); where.push(`(event_args ->> 'from' = $${params.length} OR event_args ->> 'to' = $${params.length})`); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitN = parseInt(limit,10); const offset = page * limitN;
  const sql = `SELECT * FROM events ${whereSQL} ORDER BY block_number DESC LIMIT ${limitN} OFFSET ${offset}`;
  try {
    const r = await pool.query(sql, params);
    const rows = r.rows.map(row => {
      const meta = chainMeta[row.chain] || {};
      const explorer = meta.explorer || null;
      const base = explorer ? explorer.replace(/\/+$/, '') : null;
      return {
        ...row,
        explorer: base,
        tx_url: base ? `${base}/tx/${row.tx_hash}` : null,
        block_url: base ? `${base}/block/${row.block_number}` : null
      };
    });
    res.json({ ok:true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error: err.message });
  }
});

app.post('/link-wallet', async (req,res) => {
  const { wallet_address, user_id } = req.body;
  if (!wallet_address) return res.status(400).json({ error: 'wallet_address required' });
  try {
    const insert = await pool.query(
      `INSERT INTO wallet_links (user_id, wallet_address, created_at) VALUES ($1,$2,NOW()) ON CONFLICT (wallet_address) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING *`,
      [user_id || null, wallet_address.toLowerCase()]
    );
    res.json({ ok:true, row: insert.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/stats', async (req,res) => {
  try {
    const r = await pool.query("SELECT count(*) FROM events");
    res.json({ total: parseInt(r.rows[0].count,10) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>console.log('API listening on', PORT));
