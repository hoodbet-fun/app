import { useState } from 'react'
import { formatCountdown, formatLivePrizeUsd, formatUsd, formatUsdg } from '../format.js'
import { formatApyPercent } from '../morphoVault.js'
import { PrizePoolModal } from './PrizePoolModal.jsx'

export function ProtocolOverview({
  jackpot,
  pendingHarvesterUsd,
  onChainPendingHarvesterUsd,
  isLiveEstimate = false,
  tvl,
  countdownSec,
  openDrawId,
  drawsStarted,
  firstDrawLabel,
  firstDrawCountdownSec,
  netApy,
  apyLoading,
  vaultSnapshot,
  prizeLoading = false,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const pool = jackpot != null ? Number(jackpot) : null
  const pending = pendingHarvesterUsd != null ? Number(pendingHarvesterUsd) : 0
  const hasAccrued = pending > 0
  const display = pool != null ? pool + pending : null

  return (
    <div className="protocol-overview">
      <button
        type="button"
        className="jackpot-card jackpot-compact jackpot-hero jackpot-card-btn"
        onClick={() => setModalOpen(true)}
        aria-label="Open prize pool and vault details"
      >
        <div className="jackpot-apy-badge" aria-label="Net APY">
          <span className="jackpot-apy-badge-label">Net APY</span>
          <strong>{apyLoading ? '…' : formatApyPercent(netApy)}</strong>
        </div>
        <span className="jackpot-label">Today&apos;s prize pool</span>
        <strong className="jackpot-value jackpot-value-live">
          ${display != null ? formatLivePrizeUsd(display) : '—'}
        </strong>
        {pool != null && (
          <span className={`jackpot-pending ${hasAccrued ? '' : 'jackpot-pending-muted'}`}>
            {hasAccrued ? (
              <>
                ${formatUsdg(pool)} in pool · +${formatUsdg(pendingHarvesterUsd)} accrued on harvester
              </>
            ) : (
              <>Morpho fees accrue on-chain · bot harvests into pool when shares are available</>
            )}
          </span>
        )}
        <span className="jackpot-sub">
          {prizeLoading ? 'Syncing on-chain · ' : isLiveEstimate ? 'Live estimate · ' : ''}
          Funded by vault yield · paid to draw winners · tap for details
        </span>
      </button>

      <PrizePoolModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        jackpot={jackpot}
        pendingHarvesterUsd={pendingHarvesterUsd}
        onChainPendingHarvesterUsd={onChainPendingHarvesterUsd}
        isLiveEstimate={isLiveEstimate}
        tvl={tvl}
        netApy={netApy}
        vaultSnapshot={vaultSnapshot}
      />

      <div className="protocol-stats">
        <div className="protocol-stat">
          <span className="protocol-stat-label">Total deposited</span>
          <strong>${tvl ? formatUsd(tvl) : '—'}</strong>
        </div>
        <div className="protocol-stat protocol-stat-highlight">
          <span className="protocol-stat-label">
            {drawsStarted ? 'Next draw in' : 'First draw'}
          </span>
          <strong>
            {drawsStarted
              ? (countdownSec != null ? formatCountdown(countdownSec) : '—')
              : (firstDrawCountdownSec != null ? formatCountdown(firstDrawCountdownSec) : firstDrawLabel)}
          </strong>
          {drawsStarted && openDrawId != null && (
            <span className="protocol-stat-hint">Draw #{openDrawId.toString()}</span>
          )}
          {!drawsStarted && firstDrawLabel && (
            <span className="protocol-stat-hint">{firstDrawLabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
