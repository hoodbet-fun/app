import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
}

export const addresses = {
  morphoVault: '0xDF06045aBAE69d6e73a7F0197FED917032d22194',
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  safe: '0x5FF989aCB81e612fb54d2BDE9C6334B4C9a8f117',
  prizeVault: import.meta.env.VITE_PRIZE_VAULT || '',
  hoodPoints: import.meta.env.VITE_HOOD_POINTS || '',
  hoodToken: import.meta.env.VITE_HOOD_TOKEN || '',
}

export const links = {
  docs: import.meta.env.VITE_GITBOOK_URL || 'https://hoodbet.gitbook.io/hoodbet-docs',
  landing: import.meta.env.VITE_LANDING_URL || 'https://hoodbet.fun',
  github: import.meta.env.VITE_GITHUB_URL || 'https://github.com/hoodbet-fun',
}

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(),
  },
})
