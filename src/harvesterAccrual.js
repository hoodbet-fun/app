const SECONDS_PER_YEAR = 365.25 * 24 * 3600

/** Share of vault yield routed to HoodFeeHarvester (mgmt + perf fees ≈ 55% of gross yield). */
export const HARVESTER_FEE_SHARE = 0.55

/** USD per second accruing on the harvester from Morpho vault fees. */
export function estimateHarvesterFeePerSecondUsd(tvlUsd, netApy) {
  const tvl = Number(tvlUsd)
  const apy = Number(netApy)
  if (!Number.isFinite(tvl) || tvl <= 0 || !Number.isFinite(apy) || apy <= 0) return 0
  return (tvl * apy * HARVESTER_FEE_SHARE) / SECONDS_PER_YEAR
}

/** Grow anchored on-chain pending by feePerSec since anchorAtSec. */
export function extrapolatePendingUsd(anchorPendingUsd, anchorAtSec, nowSec, feePerSec) {
  const anchor = Number(anchorPendingUsd)
  if (!Number.isFinite(anchor)) return 0
  const elapsed = Math.max(0, nowSec - anchorAtSec)
  return anchor + feePerSec * elapsed
}
