import { useReadContract } from 'wagmi'
import { addresses } from '../config.js'
import { erc4626Abi } from '../abis.js'

const PRIZE_POLL_MS = 12_000

/** Morpho fee shares held by HoodFeeHarvester — redeemable via harvest() into prize pool. */
export function useHarvesterPending() {
  const { data: harvesterShares, isLoading: sharesLoading } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'balanceOf',
    args: [addresses.hoodFeeHarvester],
    query: { refetchInterval: PRIZE_POLL_MS },
  })

  const hasShares = harvesterShares != null && harvesterShares > 0n

  const { data: pendingAssets, isLoading: assetsLoading } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: hasShares ? [harvesterShares] : undefined,
    query: { enabled: hasShares, refetchInterval: PRIZE_POLL_MS },
  })

  return {
    harvesterShares: harvesterShares ?? 0n,
    pendingAssets: pendingAssets ?? 0n,
    loading: sharesLoading || (hasShares && assetsLoading),
  }
}
