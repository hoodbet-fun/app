import { readContract } from 'wagmi/actions'
import { prizePoolAbi } from './abis.js'

/** PoolTogether v5 prize slots per tier (4 ** tier). */
const TIER_PRIZE_COUNTS = [1, 4, 16, 64]

export async function fetchClaimablePrizes(
  wagmiConfig,
  { prizePool, vaultAddress, userAddress, lastAwardedDrawId, numberOfTiers = 4 },
) {
  if (!userAddress || !prizePool || !vaultAddress) {
    return { prizes: [], total: 0n }
  }
  if (!lastAwardedDrawId || lastAwardedDrawId === 0n) {
    return { prizes: [], total: 0n }
  }

  const tiers = Math.min(Number(numberOfTiers) || 4, TIER_PRIZE_COUNTS.length)
  const prizes = []
  const tierSizes = new Map()

  for (let tier = 0; tier < tiers; tier++) {
    const prizeCount = TIER_PRIZE_COUNTS[tier]
    for (let prizeIndex = 0; prizeIndex < prizeCount; prizeIndex++) {
      try {
        const [won, claimed] = await Promise.all([
          readContract(wagmiConfig, {
            address: prizePool,
            abi: prizePoolAbi,
            functionName: 'isWinner',
            args: [vaultAddress, userAddress, tier, prizeIndex],
          }),
          readContract(wagmiConfig, {
            address: prizePool,
            abi: prizePoolAbi,
            functionName: 'wasClaimed',
            args: [vaultAddress, userAddress, tier, prizeIndex],
          }),
        ])
        if (!won || claimed) continue

        if (!tierSizes.has(tier)) {
          const size = await readContract(wagmiConfig, {
            address: prizePool,
            abi: prizePoolAbi,
            functionName: 'getTierPrizeSize',
            args: [tier],
          })
          tierSizes.set(tier, size)
        }

        const amount = tierSizes.get(tier) ?? 0n
        prizes.push({ tier, prizeIndex, amount })
      } catch {
        // Invalid tier/index or draw not ready — skip.
      }
    }
  }

  const total = prizes.reduce((sum, row) => sum + row.amount, 0n)
  return { prizes, total }
}
