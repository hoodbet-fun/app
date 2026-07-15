import { formatUnits } from 'viem'
import { explorerAddress, explorerTx, formatTimestamp, formatUsd, shortenAddress } from '../format.js'

const TIER_LABELS = ['Canary', 'Tier 1', 'Tier 2', 'Grand']

export function PrizesPanel({
  isConnected,
  onConnect,
  lastAwardedDrawId,
  lastSubgraphDraw,
  firstDrawLabel,
  drawsStarted,
  claimablePrizes,
  claimableTotalUsd,
  scanningPrizes,
  claiming,
  isBusy,
  onClaimAll,
  onRefresh,
  recentWinners,
  winnersLoading,
  subgraphDraws,
  drawsLoading,
}) {
  return (
    <div className="prizes-panel">
      <div className="prizes-panel-head">
        <h2>Prizes</h2>
        <p className="prizes-panel-lead">
          Winnings from daily draws — separate from your HoodPot deposit.
          {!drawsStarted && ` First draw: ${firstDrawLabel}.`}
        </p>
      </div>

      <div className="prizes-explainer">
        <div className="prizes-explainer-item">
          <span className="prizes-explainer-icon" aria-hidden>①</span>
          <p><strong>Deposit</strong> stays in HoodPot until you withdraw</p>
        </div>
        <div className="prizes-explainer-item">
          <span className="prizes-explainer-icon" aria-hidden>②</span>
          <p><strong>Win a draw</strong> → USDG prize appears here to claim</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="prizes-claim-box">
          <p>Connect wallet to check for unclaimed prizes.</p>
          <button className="btn btn-primary btn-full" type="button" onClick={onConnect}>
            Connect wallet
          </button>
        </div>
      ) : (
        <div className={`prizes-claim-box ${claimablePrizes.length > 0 ? 'has-prizes' : ''}`}>
          <div className="prizes-claim-header">
            <span>Claimable now</span>
            <strong>{scanningPrizes ? '…' : `$${formatUsd(claimableTotalUsd)}`}</strong>
          </div>

          {scanningPrizes ? (
            <p className="muted">Scanning on-chain…</p>
          ) : claimablePrizes.length > 0 ? (
            <>
              <div className="prize-wins">
                {claimablePrizes.map((c) => (
                  <div key={`${c.tier}-${c.prizeIndex}`} className="prize-win-card">
                    <div>
                      <span className="prize-tier">{TIER_LABELS[c.tier] || `Tier ${c.tier}`}</span>
                      <strong>Prize #{c.prizeIndex + 1}</strong>
                    </div>
                    <strong className="prize-win-amount">
                      ${formatUsd(formatUnits(c.amount, 6))}
                    </strong>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary btn-full"
                type="button"
                disabled={claiming || isBusy}
                onClick={onClaimAll}
              >
                {claiming ? 'Claiming…' : `Claim $${formatUsd(claimableTotalUsd)}`}
              </button>
            </>
          ) : (
            <div className="prizes-empty">
              <p><strong>No prizes yet.</strong></p>
              <p className="muted">
                {drawsStarted
                  ? 'Keep deposited to build odds for the next draw.'
                  : `Draws haven't started. Stay deposited before ${firstDrawLabel} for best odds.`}
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>
                Refresh
              </button>
            </div>
          )}
        </div>
      )}

      <div className="history-section">
        <h3>Recent winners</h3>
        {winnersLoading ? (
          <p className="muted">Loading…</p>
        ) : recentWinners.length > 0 ? (
          <div className="draw-history">
            {recentWinners.map((w) => (
              <div key={w.id} className="draw-history-item">
                <span className="prize-tier">{TIER_LABELS[w.tier] || `Tier ${w.tier}`}</span>
                <div className="draw-history-main">
                  <strong>${formatUsd(formatUnits(BigInt(w.payout), 6))}</strong>
                  <span className="muted">
                    Draw #{w.draw?.drawId ?? '—'} · {formatTimestamp(w.timestamp)}
                  </span>
                </div>
                <a className="draw-history-link" href={explorerAddress(w.winner)} target="_blank" rel="noreferrer">
                  {shortenAddress(w.winner)}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No winners yet — first draw {firstDrawLabel}.</p>
        )}
      </div>

      <div className="history-section">
        <h3>Draw history</h3>
        <p className="history-meta muted">
          Last awarded: draw #{lastAwardedDrawId?.toString() || lastSubgraphDraw?.drawId?.toString() || '0'}
        </p>
        {drawsLoading ? (
          <p className="muted">Loading…</p>
        ) : subgraphDraws.length > 0 ? (
          <div className="draw-history">
            {subgraphDraws.map((d) => (
              <div key={d.drawId} className="draw-history-item draw-history-draw">
                <span className="prize-tier">#{d.drawId}</span>
                <div className="draw-history-main">
                  <strong>
                    {d.prizeClaims?.length
                      ? `${d.prizeClaims.length} winner${d.prizeClaims.length > 1 ? 's' : ''}`
                      : 'Awarded'}
                  </strong>
                  <span className="muted">
                    Reserve ${formatUsd(formatUnits(BigInt(d.reserve || 0), 6))} · {formatTimestamp(d.timestamp)}
                  </span>
                </div>
                {d.txHash && (
                  <a className="draw-history-link" href={explorerTx(d.txHash)} target="_blank" rel="noreferrer">
                    Tx
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No completed draws indexed yet.</p>
        )}
      </div>
    </div>
  )
}
