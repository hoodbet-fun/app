export function formatUsd(value, decimals = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Full-precision USDG display (up to 6 decimals, trims trailing zeros). */
export function formatUsdg(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const fixed = n.toFixed(6).replace(/\.?0+$/, '')
  const [int, frac] = fixed.split('.')
  const intFmt = Number(int).toLocaleString('en-US')
  return frac ? `${intFmt}.${frac}` : intFmt
}

export function shortenAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function formatCountdown(seconds) {
  if (seconds <= 0) return 'Draw closing…'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function explorerAddress(addr) {
  return `https://robinhoodchain.blockscout.com/address/${addr}`
}

export function explorerTx(hash) {
  return `https://robinhoodchain.blockscout.com/tx/${hash}`
}

export function formatTimestamp(unixSec) {
  const n = Number(unixSec)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date(n * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
