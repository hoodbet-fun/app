import { formatCountdown, formatLivePrizeUsd, formatUsd, formatUsdg } from '../format.js'
import { formatApyPercent } from '../morphoVault.js'

export function ProtocolOverview({
  jackpot,
  pendingHarvesterUsd,
  tvl,
  countdownSec,
  openDrawId,
  drawsStarted,
  firstDrawLabel,
  netApy,
  apyLoading,
  prizeLoading = false,
}) {
  const pool = jackpot != null ? Number(jackpot) : null
  const pending = pendingHarvesterUsd != null ? Number(pendingHarvesterUsd) : 0
  const hasAccrued = pending > 0
  const display = pool != null ? pool + pending : null

  return (
    <div className="protocol-overview">
      <div className="jackpot-card jackpot-compact jackpot-hero">
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
          {prizeLoading ? 'Simulating on-chain accrual · ' : hasAccrued ? 'On-chain preview · ' : ''}
          Funded by vault yield · paid to draw winners
        </span>
      </div>

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
              : firstDrawLabel}
          </strong>
          {drawsStarted && openDrawId != null && (
            <span className="protocol-stat-hint">Draw #{openDrawId.toString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
