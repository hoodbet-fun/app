import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import {
  estimateHarvesterFeePerSecondUsd,
  extrapolatePendingUsd,
} from '../harvesterAccrual.js'
import { useHarvesterPending } from './useHarvesterPending.js'

/**
 * Anchor harvester pending from on-chain simulation, then extrapolate locally at ~55% of vault APY.
 */
export function useLiveHarvesterAccrual({ tvlUsd, netApy, nowSec }) {
  const { pendingAssets, loading, dataUpdatedAt } = useHarvesterPending()
  const onChainPendingUsd = Number(formatUnits(pendingAssets, 6))
  const [anchor, setAnchor] = useState({ pendingUsd: 0, atSec: nowSec })

  useEffect(() => {
    if (loading) return
    setAnchor({ pendingUsd: onChainPendingUsd, atSec: Math.floor(Date.now() / 1000) })
  }, [onChainPendingUsd, loading, dataUpdatedAt])

  const feePerSec = estimateHarvesterFeePerSecondUsd(tvlUsd, netApy)
  const pendingUsd = extrapolatePendingUsd(anchor.pendingUsd, anchor.atSec, nowSec, feePerSec)

  return {
    pendingUsd,
    onChainPendingUsd,
    feePerSec,
    loading,
    isLiveEstimate: feePerSec > 0 && !loading,
    syncedAtSec: anchor.atSec,
  }
}
