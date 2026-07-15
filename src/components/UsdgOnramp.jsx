import { links } from '../config.js'

export function UsdgOnramp({ compact = false }) {
  return (
    <a
      className={`btn btn-primary btn-sm usdg-onramp-link ${compact ? 'usdg-onramp-link-compact' : ''}`}
      href={links.getUsdg}
      target="_blank"
      rel="noreferrer"
    >
      Get USDG
    </a>
  )
}
