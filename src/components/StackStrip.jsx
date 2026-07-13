import { addresses } from '../config.js'

const STACK = [
  { label: 'Robinhood Chain', href: 'https://docs.robinhood.com/chain/' },
  { label: 'Morpho', href: 'https://morpho.org/' },
  { label: 'HoodPot', current: true },
]

export function StackStrip({ className = '' }) {
  return (
    <div className={`stack-strip ${className}`.trim()} role="list" aria-label="Protocol stack">
      <div className="stack-strip-protocols">
        {STACK.map((item, i) => (
          <span key={item.label} className="stack-strip-item" role="listitem">
            {i > 0 && <span className="stack-strip-dot" aria-hidden>·</span>}
            {item.current ? (
              <span className="stack-strip-current">{item.label}</span>
            ) : (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            )}
          </span>
        ))}
      </div>
      <span className="stack-strip-divider" aria-hidden />
      <span className="stack-strip-live">
        <span className="stack-strip-live-dot" aria-hidden />
        Mainnet live
        <span className="stack-strip-chain">· 4663</span>
      </span>
    </div>
  )
}
