export const VAULT_YIELD_BUFFER_ERROR =
  'Deposits are blocked: HoodPot PrizeVault was deployed without a yield buffer. A new vault must be deployed via Safe with at least 1 USDG buffer seed.'

export function parseDepositError(err) {
  const msg = err?.shortMessage || err?.message || err?.cause?.message || 'Transaction failed'
  if (/rejected|denied|cancel/i.test(msg)) return 'Transaction cancelled in wallet.'
  if (/LossyDeposit|0x2b8b305a/i.test(msg)) return VAULT_YIELD_BUFFER_ERROR
  if (/chain.*does not match|wrong network/i.test(msg)) return msg
  return msg
}
