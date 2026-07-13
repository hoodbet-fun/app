import { waitForTransactionReceipt } from 'wagmi/actions'
import { robinhoodChain } from './config.js'

export const TX_TIMEOUT_MS = 120_000

export async function waitForTx(wagmiConfig, hash) {
  return Promise.race([
    waitForTransactionReceipt(wagmiConfig, {
      hash,
      chainId: robinhoodChain.id,
      pollingInterval: 2_000,
    }),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Transaction confirmation timed out. Check Blockscout or try again.')),
        TX_TIMEOUT_MS,
      )
    }),
  ])
}

export function txExplorerUrl(hash) {
  return `${robinhoodChain.blockExplorers.default.url}/tx/${hash}`
}
