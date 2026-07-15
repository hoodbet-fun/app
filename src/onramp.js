import { addresses } from './config.js'

const ROBINHOOD_CHAIN_ID = 4663
const JUMPER_IFRAME = 'https://iframe.jumper.xyz/'
const JUMPER_APP = 'https://jumper.xyz/'

/** @typedef {'usdg' | 'vault'} JumperOnrampTarget */

/**
 * Build a Jumper (LI.FI) URL — swap or bridge any supported token into USDG or HoodPot vault shares.
 * @param {{ target?: JumperOnrampTarget, embedded?: boolean, lockFromChain?: boolean }} opts
 */
export function buildJumperOnrampUrl({
  target = 'usdg',
  embedded = true,
  lockFromChain = false,
} = {}) {
  const base = embedded ? JUMPER_IFRAME : JUMPER_APP
  const params = new URLSearchParams()
  if (lockFromChain) params.set('fromChain', String(ROBINHOOD_CHAIN_ID))
  params.set('toChain', String(ROBINHOOD_CHAIN_ID))
  params.set('toToken', target === 'vault' ? addresses.prizeVault : addresses.usdg)
  params.set('theme', 'dark')
  params.set('integrator', 'hoodbet.fun')
  return `${base}?${params.toString()}`
}

export const onrampCopy = {
  usdg: {
    title: 'Get USDG',
    hint: 'Swap or bridge any token into USDG on Robinhood Chain, then deposit below.',
    cta: 'Open Jumper',
  },
  vault: {
    title: 'Any token → HoodPot',
    hint: 'Route through Jumper to receive HoodPot vault shares in one flow (when supported for your token).',
    cta: 'Open in Jumper',
  },
}
