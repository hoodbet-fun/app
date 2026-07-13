import { useCallback, useEffect, useState } from 'react'
import { fetchClaimablePrizes } from '../claims.js'

const POLL_MS = 60_000

export function useClaimablePrizes({
  wagmiConfig,
  prizePool,
  vaultAddress,
  userAddress,
  lastAwardedDrawId,
  numberOfTiers,
  enabled = true,
}) {
  const [prizes, setPrizes] = useState([])
  const [total, setTotal] = useState(0n)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled || !userAddress) {
      setPrizes([])
      setTotal(0n)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchClaimablePrizes(wagmiConfig, {
        prizePool,
        vaultAddress,
        userAddress,
        lastAwardedDrawId,
        numberOfTiers,
      })
      setPrizes(result.prizes)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      setError(err)
      setPrizes([])
      setTotal(0n)
    } finally {
      setLoading(false)
    }
  }, [
    enabled,
    wagmiConfig,
    prizePool,
    vaultAddress,
    userAddress,
    lastAwardedDrawId,
    numberOfTiers,
  ])

  useEffect(() => {
    refresh()
    if (!enabled || !userAddress) return undefined
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh, enabled, userAddress])

  return { prizes, total, loading, error, refresh }
}
