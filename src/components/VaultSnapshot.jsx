import { addresses } from '../config.js'
import { explorerAddress } from '../format.js'
import { useMorphoVaultSnapshot } from '../hooks/useMorphoVaultSnapshot.js'
import { formatApyPercent, morphoVaultAppUrl } from '../morphoVault.js'

function formatUsdCompact(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}k`
  return `$${value.toFixed(2)}`
}

export function VaultSnapshot({ vaultAddress = addresses.morphoVault, className = '' }) {
  const { snapshot, loading, error } = useMorphoVaultSnapshot(vaultAddress)

  return (
    <section className={`vault-snapshot ${className}`.trim()} aria-label="Morpho yield vault">
      <div className="vault-snapshot-head">
        <div className="vault-snapshot-apy-hero">
          <span className="vault-snapshot-stat-label">Net APY</span>
          <strong className="vault-snapshot-apy-value">
            {loading ? '…' : formatApyPercent(snapshot?.netApy)}
          </strong>
          <span className="vault-snapshot-apy-hint">Live Morpho yield on USDG</span>
        </div>
        <div className="vault-snapshot-head-side">
          <div className="vault-snapshot-identity">
            <span className="vault-snapshot-label">Yield vault</span>
            <strong className="vault-snapshot-name">{snapshot?.name || 'hoodbet.fun'}</strong>
            <span className="vault-snapshot-meta">Morpho · Robinhood Chain</span>
          </div>
          <div className="vault-snapshot-tvl">
            <span className="vault-snapshot-stat-label">TVL</span>
            <strong>{loading ? '…' : formatUsdCompact(snapshot?.totalAssetsUsd)}</strong>
          </div>
        </div>
      </div>

      {error && <p className="vault-snapshot-error">Could not load Morpho vault data.</p>}

      {!error && (
        <div className="vault-snapshot-body">
          <span className="vault-snapshot-section-label">Current allocation</span>
          {loading && !snapshot ? (
            <p className="vault-snapshot-muted">Loading allocation…</p>
          ) : snapshot?.allocations?.length ? (
            <ul className="vault-allocation-list">
              {snapshot.allocations.map((row) => (
                <li key={row.id} className="vault-allocation-row">
                  <div className="vault-allocation-top">
                    <span className="vault-allocation-label">{row.label}</span>
                    <span className="vault-allocation-stats">
                      <strong className="vault-allocation-apy">{formatApyPercent(row.apy)}</strong>
                      <span>{row.pct.toFixed(1)}% alloc</span>
                    </span>
                  </div>
                  <div className="vault-allocation-bar" aria-hidden>
                    <span style={{ width: `${Math.max(row.pct, 0.5)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vault-snapshot-muted">No allocation data yet.</p>
          )}
        </div>
      )}

      <div className="vault-snapshot-links">
        <a href={morphoVaultAppUrl(vaultAddress, snapshot?.chainId, snapshot?.name || 'hoodbet.fun')} target="_blank" rel="noreferrer">
          Morpho app →
        </a>
        <a href={explorerAddress(vaultAddress)} target="_blank" rel="noreferrer">
          Vault on-chain →
        </a>
      </div>
    </section>
  )
}
