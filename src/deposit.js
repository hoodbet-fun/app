export const VAULT_DEPOSIT_BLOCKED = {
  title: 'Deposits temporarily paused',
  description:
    'This PrizeVault was deployed without a yield buffer, so new deposits are disabled on-chain. Governance must deploy a replacement vault via Safe with at least 1 USDG buffer seed.',
  docsLabel: 'Redeploy guide',
  docsHref: 'https://hoodbet.gitbook.io/hoodbet-docs',
  safeLabel: 'Open Safe',
  safeHref: 'https://app.safe.global/home?safe=robinhood:0x5FF989aCB81e612fb54d2BDE9C6334B4C9a8f117',
}

export const VAULT_YIELD_BUFFER_ERROR = VAULT_DEPOSIT_BLOCKED.description

export function parseDepositError(err) {
  const msg = err?.shortMessage || err?.message || err?.cause?.message || 'Transaction failed'
  if (/rejected|denied|cancel/i.test(msg)) return 'Transaction cancelled in wallet.'
  if (/LossyDeposit|0x2b8b305a/i.test(msg)) return VAULT_YIELD_BUFFER_ERROR
  if (/chain.*does not match|wrong network/i.test(msg)) return msg
  return msg
}
