import { useQuery } from '@tanstack/react-query'
import { zeroAddress } from 'viem'
import { simulateCalls } from 'viem/actions'
import { usePublicClient } from 'wagmi'
import { addresses } from '../config.js'
import { erc4626Abi, morphoVaultAbi } from '../abis.js'

/** Re-anchor on-chain pending occasionally; UI extrapolates between syncs. */
const PRIZE_POLL_MS = 5 * 60_000

const morphoSimAbi = [...morphoVaultAbi, ...erc4626Abi]

/**
 * Morpho fee shares claimable by HoodFeeHarvester — includes fees not yet minted until accrueInterest().
 * Uses eth_call simulation (no gas) so micro-accrual below $0.01 is visible in the UI.
 */
export function useHarvesterPending() {
  const client = usePublicClient()

  const query = useQuery({
    queryKey: ['harvesterPending', addresses.morphoVault, addresses.hoodFeeHarvester],
    enabled: Boolean(client),
    refetchInterval: PRIZE_POLL_MS,
    queryFn: async () => {
      const morpho = addresses.morphoVault
      const harvester = addresses.hoodFeeHarvester

      const { results } = await simulateCalls(client, {
        account: zeroAddress,
        calls: [
          { to: morpho, abi: morphoSimAbi, functionName: 'accrueInterest' },
          { to: morpho, abi: morphoSimAbi, functionName: 'balanceOf', args: [harvester] },
        ],
      })

      const shares = results[1]?.status === 'success' ? results[1].result : 0n
      if (shares === 0n) {
        return { shares: 0n, pendingAssets: 0n }
      }

      const { results: assetResults } = await simulateCalls(client, {
        account: zeroAddress,
        calls: [
          { to: morpho, abi: morphoSimAbi, functionName: 'accrueInterest' },
          { to: morpho, abi: morphoSimAbi, functionName: 'convertToAssets', args: [shares] },
        ],
      })

      const pendingAssets =
        assetResults[1]?.status === 'success' ? assetResults[1].result : 0n

      return { shares, pendingAssets }
    },
  })

  return {
    harvesterShares: query.data?.shares ?? 0n,
    pendingAssets: query.data?.pendingAssets ?? 0n,
    loading: query.isLoading || query.isFetching,
  }
}
