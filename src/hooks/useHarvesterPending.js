import { useReadContract } from 'wagmi'
import { addresses } from '../config.js'
import { erc4626Abi } from '../abis.js'

/** Morpho fee shares held by HoodFeeHarvester — redeemable via harvest() into prize pool. */
export function useHarvesterPending() {
  const { data: harvesterShares, isLoading: sharesLoading } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'balanceOf',
    args: [addresses.hoodFeeHarvester],
  })

  const hasShares = harvesterShares != null && harvesterShares > 0n

  const { data: pendingAssets, isLoading: assetsLoading } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: hasShares ? [harvesterShares] : undefined,
    query: { enabled: hasShares },
  })

  return {
    harvesterShares: harvesterShares ?? 0n,
    pendingAssets: pendingAssets ?? 0n,
    loading: sharesLoading || (hasShares && assetsLoading),
  }
}
