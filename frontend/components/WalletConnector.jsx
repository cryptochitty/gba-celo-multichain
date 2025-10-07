import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig, useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { supportedChains } from '../lib/chains';

const { chains, provider, webSocketProvider } = configureChains(supportedChains, [ publicProvider() ]);
const { connectors } = getDefaultWallets({ appName: 'GBA On-chain Events', chains });
const wagmiClient = createClient({ autoConnect: true, connectors, provider, webSocketProvider });

function WalletInner({ apiBase }) {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  async function linkWalletToBackend() {
    if (!isConnected) { alert('Please connect wallet'); return; }
    const payload = { wallet_address: address };
    try {
      const res = await fetch(`${apiBase}/link-wallet`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      alert('Wallet linked');
    } catch (e) { alert('Link failed: '+e.message); }
  }
  return (
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <ConnectButton showBalance={false} />
      {isConnected ? (
        <div style={{fontSize:12}}>
          <div><strong>{address}</strong></div>
          <div>Chain: {chain?.name ?? chain?.id}</div>
          {switchNetwork && (
            <select onChange={(e)=>switchNetwork(Number(e.target.value))} defaultValue={chain?.id}>
              {chains.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div style={{marginTop:6}}>
            <button className="btn btn-primary" onClick={linkWalletToBackend}>Link wallet</button>
          </div>
        </div>
      ) : <div>Not connected</div>}
    </div>
  );
}

export default function WalletConnector({ apiBase }) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <WalletInner apiBase={apiBase} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
