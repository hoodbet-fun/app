import { robinhoodChain } from './config.js'

const RH_CHAIN_HEX = `0x${robinhoodChain.id.toString(16)}`

export function getWalletChainId() {
  if (typeof window === 'undefined' || !window.ethereum) return null
  return window.ethereum.request({ method: 'eth_chainId' }).then((hex) => Number(hex))
}

export async function addRobinhoodChain() {
  const ethereum = window.ethereum
  if (!ethereum) throw new Error('No wallet detected')

  await ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: RH_CHAIN_HEX,
        chainName: robinhoodChain.name,
        nativeCurrency: robinhoodChain.nativeCurrency,
        rpcUrls: robinhoodChain.rpcUrls.default.http,
        blockExplorerUrls: [robinhoodChain.blockExplorers.default.url],
      },
    ],
  })
}

function isUnknownChainError(err) {
  const msg = err?.message || err?.shortMessage || ''
  return (
    err?.code === 4902 ||
    err?.code === -32603 && /chain/i.test(msg) ||
    /unrecognized chain|not added|unknown chain|chain not configured/i.test(msg)
  )
}

export async function ensureRobinhoodNetwork({ switchChainAsync, currentChainId }) {
  if (currentChainId === robinhoodChain.id) return

  try {
    await switchChainAsync({ chainId: robinhoodChain.id })
    return
  } catch (err) {
    if (!isUnknownChainError(err)) throw err
  }

  await addRobinhoodChain()
  await switchChainAsync({ chainId: robinhoodChain.id })
}

export function chainMismatchMessage(walletChainId) {
  if (!walletChainId) return 'Connect wallet on Robinhood Chain (4663).'
  if (walletChainId === 1) {
    return 'Wallet is on Ethereum mainnet. Switch to Robinhood Chain (4663) to deposit USDG.'
  }
  return `Wallet is on chain ${walletChainId}. Switch to Robinhood Chain (4663).`
}
