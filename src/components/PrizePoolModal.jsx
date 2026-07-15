import { useEffect } from 'react'
import { addresses } from '../config.js'
import { explorerAddress, formatLivePrizeUsd, formatUsd, formatUsdg } from '../format.js'
import { formatApyPercent, morphoVaultAppUrl } from '../morphoVault.js'
import { HARVESTER_FEE_SHARE } from '../harvesterAccrual.js'
import { VaultSnapshot } from './VaultSnapshot.jsx'

export function PrizePoolModal({
  open,
  onClose,
  jackpot,
  pendingHarvesterUsd,
  onChainPendingHarvesterUsd,
  isLiveEstimate,
  tvl,
  netApy,
  vaultSnapshot,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const pool = jackpot != null ? Number(jackpot) : null
  const pending = pendingHarvesterUsd != null ? Number(pendingHarvesterUsd) : 0
  const onChainPending = onChainPendingHarvesterUsd != null ? Number(onChainPendingHarvesterUsd) : pending
  const total = pool != null ? pool + pending : null

  return (
    <div className="prize-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="prize-modal"
        role="dialog"
        aria-labelledby="prize-modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="prize-modal-head">
          <div>
            <h2 id="prize-modal-title">Prize pool</h2>
            <p className="prize-modal-sub">
              Yield from the Morpho vault funds daily draw prizes via HoodFeeHarvester.
            </p>
          </div>
          <button type="button" className="prize-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="prize-modal-total">
          <span>Total (pool + accruing)</span>
          <strong>${total != null ? formatLivePrizeUsd(total) : '—'}</strong>
        </div>

        <dl className="prize-modal-breakdown">
          <div>
            <dt>In prize pool (on-chain)</dt>
            <dd>${pool != null ? formatUsdg(pool) : '—'}</dd>
          </div>
          <div>
            <dt>Accrued on harvester</dt>
            <dd>${formatUsdg(pendingHarvesterUsd)}</dd>
          </div>
          {isLiveEstimate && onChainPending !== pending && (
            <div className="prize-modal-breakdown-meta">
              <dt>Last on-chain sync</dt>
              <dd>${formatUsdg(onChainPending)}</dd>
            </div>
          )}
        </dl>

        <p className="prize-modal-note">
          {isLiveEstimate ? (
            <>
              Harvester pending is read on-chain at load, then estimated live at{' '}
              <strong>{(HARVESTER_FEE_SHARE * 100).toFixed(0)}%</strong> of vault APY
              ({formatApyPercent(netApy)} on ${tvl ? formatUsd(tvl) : '—'} TVL). Re-syncs every ~5 min.
            </>
          ) : (
            <>Harvester fees accrue on Morpho and are swept into the pool by the harvest bot.</>
          )}
        </p>

        <VaultSnapshot className="vault-snapshot-compact prize-modal-vault" />

        <footer className="prize-modal-links">
          <a href={morphoVaultAppUrl(addresses.morphoVault, 4663, vaultSnapshot?.name)} target="_blank" rel="noreferrer">
            Morpho vault →
          </a>
          <a href={explorerAddress(addresses.hoodFeeHarvester)} target="_blank" rel="noreferrer">
            Harvester →
          </a>
          <a href={explorerAddress(addresses.prizePool)} target="_blank" rel="noreferrer">
            Prize pool →
          </a>
        </footer>
      </div>
    </div>
  )
}
