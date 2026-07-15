import { formatUsd } from '../format.js'

function OddsDisplay({ oddsPercent, drawsStarted, firstDrawLabel }) {
  if (!drawsStarted) {
    return (
      <>
        <strong className="user-stat-pending">Pending</strong>
        <span className="user-stat-hint">Odds appear after the first draw ({firstDrawLabel})</span>
      </>
    )
  }
  if (oddsPercent == null) {
    return (
      <>
        <strong>—</strong>
        <span className="user-stat-hint">Deposit to enter the current draw period</span>
      </>
    )
  }
  const pct = oddsPercent < 0.0001 ? '<0.0001%' : `${oddsPercent.toFixed(2)}%`
  return (
    <>
      <strong>{pct}</strong>
      <span className="user-stat-hint">Share of pool this draw (TWAB)</span>
    </>
  )
}

export function UserDashboard({
  isConnected,
  positionUsd,
  walletUsd,
  oddsPercent,
  drawsStarted,
  firstDrawLabel,
  claimableTotalUsd,
  claimableCount,
  scanningPrizes,
  onGoPrizes,
}) {
  if (!isConnected) {
    return (
      <div className="user-dashboard user-dashboard-empty">
        <p className="user-dashboard-empty-text">Connect your wallet to see your position, odds, and winnings.</p>
      </div>
    )
  }

  const hasPosition = Number(positionUsd) > 0
  const hasClaimable = claimableCount > 0

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-head">
        <h2 className="user-dashboard-title">Your account</h2>
        <p className="user-dashboard-sub">Deposits vs winnings — these are separate balances</p>
      </div>

      <div className="user-stats">
        <div className={`user-stat ${hasPosition ? 'user-stat-highlight' : ''}`}>
          <span className="user-stat-label">In HoodPot</span>
          <strong>${formatUsd(positionUsd)}</strong>
          <span className="user-stat-hint">Your deposit · withdraw anytime</span>
        </div>

        <div className="user-stat">
          <span className="user-stat-label">Wallet USDG</span>
          <strong>${formatUsd(walletUsd)}</strong>
          <span className="user-stat-hint">Available to deposit</span>
        </div>

        <div className="user-stat">
          <span className="user-stat-label">Draw odds</span>
          <OddsDisplay
            oddsPercent={oddsPercent}
            drawsStarted={drawsStarted}
            firstDrawLabel={firstDrawLabel}
          />
        </div>

        <button
          type="button"
          className={`user-stat user-stat-claim ${hasClaimable ? 'has-winnings' : ''}`}
          onClick={onGoPrizes}
        >
          <span className="user-stat-label">Winnings</span>
          <strong>{scanningPrizes ? '…' : `$${formatUsd(claimableTotalUsd)}`}</strong>
          <span className="user-stat-hint">
            {hasClaimable
              ? `${claimableCount} prize${claimableCount > 1 ? 's' : ''} to claim →`
              : 'Prizes from draws you won'}
          </span>
        </button>
      </div>
    </div>
  )
}
