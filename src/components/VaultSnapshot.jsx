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
        <div>
          <span className="vault-snapshot-label">Yield vault</span>
          <strong className="vault-snapshot-name">{snapshot?.name || 'hoodbet.fun'}</strong>
          <span className="vault-snapshot-meta">Morpho · Robinhood Chain · USDG</span>
        </div>
        <div className="vault-snapshot-apys">
          <div>
            <span className="vault-snapshot-stat-label">Net APY</span>
            <strong>{loading ? '…' : formatApyPercent(snapshot?.netApy)}</strong>
          </div>
          <div>
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
                      <strong>{row.pct.toFixed(1)}%</strong>
                      <span>{formatApyPercent(row.apy)}</span>
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
        <a href={morphoVaultAppUrl(vaultAddress)} target="_blank" rel="noreferrer">
          Morpho app →
        </a>
        <a href={explorerAddress(vaultAddress)} target="_blank" rel="noreferrer">
          Vault on-chain →
        </a>
      </div>
    </section>
  )
}
