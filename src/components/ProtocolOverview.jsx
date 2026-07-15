import { formatApyPercent } from '../morphoVault.js'
import { formatCountdown, formatPrizeUsd, formatUsd, formatUsdg } from '../format.js'

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
}) {
  return (
    <div className="protocol-overview">
      <div className="jackpot-card jackpot-compact jackpot-hero">
        <div className="jackpot-apy-badge" aria-label="Net APY">
          <span className="jackpot-apy-badge-label">Net APY</span>
          <strong>{apyLoading ? '…' : formatApyPercent(netApy)}</strong>
        </div>
        <span className="jackpot-label">Today&apos;s prize pool</span>
        <strong className="jackpot-value">${jackpot != null ? formatPrizeUsd(jackpot) : '—'}</strong>
        {pendingHarvesterUsd != null && Number(pendingHarvesterUsd) > 0 && (
          <span className="jackpot-pending">
            + ${formatUsdg(pendingHarvesterUsd)} pending harvest (Morpho fees)
          </span>
        )}
        <span className="jackpot-sub">Funded by vault yield · paid to draw winners</span>
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
