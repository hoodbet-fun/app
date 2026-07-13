import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'] },
    public: { http: [import.meta.env.VITE_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
}

export const addresses = {
  morphoVault: '0xDF06045aBAE69d6e73a7F0197FED917032d22194',
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  safe: '0x5FF989aCB81e612fb54d2BDE9C6334B4C9a8f117',
  hoodRng: '0x8B6EdfeCe14210eCb2A8D28F333D81621103Dd19',
  prizePool: '0x14e5004a757a85439fc379c8acd5b3b3cdf47344',
  prizeVault: '0x11da9bE66d20328c6eA16d52079890322fA90f24',
  drawManager: '0xd1c3d3b690c9a2033b0bea03ba0771847fd983eb',
  twabController: '0x534eb000af980efe5dc8f7b1b579c3c4baf87942',
  hoodFeeHarvester: '0x7FB9C432e78101a6bB59e681458888acaA3db532',
  claimer: '0x71ec0971e8f8e35568a4bbe0fc118e6ca0ebe707',
  hoodPoints: '0x7EBb6063C98e2D9faAD4C67A99d6A259f7810901',
  hoodToken: '0x3b4b9E8982449aa6712F0d13162252A4a871D43e',
}

export const links = {
  docs: 'https://hoodbet.gitbook.io/hoodbet-docs',
  landing: 'https://hoodbet.fun',
  github: 'https://github.com/hoodbet-fun',
  telegram: 'https://t.me/+8KdjgSVzZr5hZjc0',
}

export const hoodTokenLinks = {
  virtuals: 'https://app.virtuals.io/virtuals/105591',
  explorer: `https://robinhoodchain.blockscout.com/address/${addresses.hoodToken}`,
  tiers: `${links.landing}#hood-tiers`,
}

export const subgraphUrl =
  'https://api.goldsky.com/api/public/project_cmmaz8bs32rjv01u29b8y8vuf/subgraphs/hoodbet/1.0.0/gn'

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(),
  },
})
