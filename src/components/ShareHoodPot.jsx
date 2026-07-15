import { links } from '../config.js'

const SHARE_TEXT =
  'Playing HoodPot on Robinhood Chain. USDG yield via Morpho vault plus PoolTogether V5 daily jackpots. Deposit at app.hoodbet.fun'

export function ShareHoodPot({ className = '' }) {
  const handleShare = async () => {
    const payload = { title: 'HoodPot', text: SHARE_TEXT, url: links.app }

    if (navigator.share) {
      try {
        await navigator.share(payload)
        return
      } catch {
        // user cancelled or share unavailable
      }
    }

    const intent = new URL('https://x.com/intent/tweet')
    intent.searchParams.set('text', `${SHARE_TEXT} ${links.app}`)
    window.open(intent.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <button type="button" className={`btn btn-ghost btn-sm ${className}`.trim()} onClick={handleShare}>
      Share on X
    </button>
  )
}
