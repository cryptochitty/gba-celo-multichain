import React, { useState } from 'react';
import useSWR from 'swr';
import WalletConnector from '../components/WalletConnector';

const fetcher = (url) => fetch(url).then(r=>r.json());

export default function EventsPage() {
  const [chain, setChain] = useState('celo');
  const [contractFilter, setContractFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_EVENT_API || 'http://localhost:8080';
  const url = `${apiBase}/events?chain=${encodeURIComponent(chain)}&limit=50&contract=${encodeURIComponent(contractFilter)}&event=${encodeURIComponent(eventFilter)}`;
  const { data, error } = useSWR(url, fetcher, { refreshInterval: 10000 });
  return (
    <div style={{padding:24, maxWidth:1100, margin:'0 auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>GBA On-chain Events (Multi-chain)</h1>
        <WalletConnector apiBase={apiBase} />
      </div>
      <div style={{marginTop:12, display:'flex', gap:8}}>
        <select value={chain} onChange={(e)=>setChain(e.target.value)}>
          <option value="celo">Celo</option>
          <option value="polygon">Polygon</option>
          <option value="base">Base</option>
          <option value="superchain">Superchain</option>
        </select>
        <input value={contractFilter} onChange={(e)=>setContractFilter(e.target.value)} placeholder="Contract address" />
        <input value={eventFilter} onChange={(e)=>setEventFilter(e.target.value)} placeholder="Event name" />
      </div>
      <div style={{marginTop:20}}>
        {error && <div style={{color:'red'}}>Failed to load events: {String(error)}</div>}
        {!data && <div>Loading...</div>}
        {data && data.rows && (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead style={{background:'#f3f4f6'}}>
              <tr><th>Chain</th><th>Block</th><th>Tx</th><th>Contract</th><th>Event</th><th>Args</th><th>Time</th></tr>
            </thead>
            <tbody>
              {data.rows.map(ev=>(
                <tr key={`${ev.chain}-${ev.tx_hash}-${ev.id}`} style={{borderTop:'1px solid #e5e7eb'}}>
                  <td>{ev.chain}</td>
                  <td>{ev.block_number}{ev.block_url && <a style={{marginLeft:8}} href={ev.block_url} target="_blank" rel="noreferrer">view</a>}</td>
                  <td>{ev.tx_url ? <a href={ev.tx_url} target="_blank" rel="noreferrer">{ev.tx_hash.slice(0,10)}...</a> : ev.tx_hash.slice(0,10)}</td>
                  <td>{ev.contract_address.slice(0,12)}...</td>
                  <td>{ev.event_name}</td>
                  <td>{ev.event_args ? JSON.stringify(ev.event_args).slice(0,80) : ''}</td>
                  <td>{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
