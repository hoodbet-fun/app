import { useState } from 'react'
import { addresses, hoodTokenLinks } from '../config.js'

export function HoodTokenCard({ className = '' }) {
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addresses.hoodToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className={`hood-token-card ${className}`.trim()} aria-label="Buy $HOOD on Virtuals">
      <div className="hood-token-card-head">
        <span className="hood-token-card-label">Agent token</span>
        <strong className="hood-token-card-title">$HOOD · Virtuals</strong>
      </div>

      <div className="hood-token-address-row">
        <code className="hood-token-address" title={addresses.hoodToken}>
          {addresses.hoodToken}
        </code>
        <button
          type="button"
          className="hood-token-copy"
          onClick={copyAddress}
          aria-label="Copy $HOOD contract address"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="hood-token-actions">
        <a className="btn btn-primary btn-full" href={hoodTokenLinks.virtuals} target="_blank" rel="noreferrer">
          Buy on Virtuals
        </a>
        <div className="hood-token-actions-row">
          <a className="btn btn-ghost btn-sm" href={hoodTokenLinks.explorer} target="_blank" rel="noreferrer">
            Blockscout
          </a>
          <a className="btn btn-ghost btn-sm" href={hoodTokenLinks.tiers} target="_blank" rel="noreferrer">
            Tiers →
          </a>
        </div>
      </div>

      <p className="hood-token-note">
        <strong>Scout = 0 $HOOD</strong> — HoodPot works without holding.
      </p>
    </section>
  )
}
