export const celoChain = {
  id: 42220, name: 'Celo', network: 'celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: 'https://forno.celo.org' },
  blockExplorers: { default: { name: 'Celo Explorer', url: 'https://explorer.celo.org' } }
};
export const polygonChain = {
  id: 137, name: 'Polygon', network: 'polygon',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: { default: 'https://polygon-rpc.com' },
  blockExplorers: { default: { name: 'Polygonscan', url: 'https://polygonscan.com' } }
};
export const baseChain = {
  id: 8453, name: 'Base', network: 'base',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: 'https://mainnet.base.org' },
  blockExplorers: { default: { name: 'Base Explorer', url: 'https://basescan.org' } }
};
export const superchain = {
  id: 1700, name: 'Superchain', network: 'superchain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: 'https://rpc.superchain.example' },
  blockExplorers: { default: { name: 'Superchain Explorer', url: 'https://superchain-explorer.example' } }
};
export const supportedChains = [celoChain, polygonChain, baseChain, superchain];
