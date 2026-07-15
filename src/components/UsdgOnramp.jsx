import { useMemo, useState } from 'react'
import { buildJumperOnrampUrl, onrampCopy } from '../onramp.js'

export function UsdgOnramp({ compact = false, defaultTarget = 'usdg', showVaultTab = true }) {
  const [target, setTarget] = useState(defaultTarget)
  const [embedOpen, setEmbedOpen] = useState(!compact)

  const iframeSrc = useMemo(() => buildJumperOnrampUrl({ target, embedded: true }), [target])
  const externalHref = useMemo(() => buildJumperOnrampUrl({ target, embedded: false }), [target])
  const copy = onrampCopy[target] ?? onrampCopy.usdg

  return (
    <div className={`usdg-onramp ${compact ? 'usdg-onramp-compact' : ''}`}>
      {showVaultTab && (
        <div className="usdg-onramp-tabs" role="tablist" aria-label="Funding route">
          <button
            type="button"
            role="tab"
            aria-selected={target === 'usdg'}
            className={`usdg-onramp-tab ${target === 'usdg' ? 'active' : ''}`}
            onClick={() => setTarget('usdg')}
          >
            Get USDG
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={target === 'vault'}
            className={`usdg-onramp-tab ${target === 'vault' ? 'active' : ''}`}
            onClick={() => setTarget('vault')}
          >
            Any token → HoodPot
          </button>
        </div>
      )}

      <p className="usdg-onramp-hint">{copy.hint}</p>

      <div className="usdg-onramp-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setEmbedOpen((open) => !open)}
        >
          {embedOpen ? 'Hide swap widget' : copy.title}
        </button>
        <a className="btn btn-outline btn-sm" href={externalHref} target="_blank" rel="noreferrer">
          {copy.cta} ↗
        </a>
      </div>

      {embedOpen && (
        <div className="usdg-onramp-frame-wrap">
          <iframe
            title={copy.title}
            className="usdg-onramp-frame"
            src={iframeSrc}
            allow="clipboard-write; encrypted-media"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="usdg-onramp-powered">
            Powered by{' '}
            <a href={externalHref} target="_blank" rel="noreferrer">
              Jumper
            </a>{' '}
            (LI.FI)
          </p>
        </div>
      )}
    </div>
  )
}
