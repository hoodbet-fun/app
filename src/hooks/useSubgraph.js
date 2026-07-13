import { useEffect, useState } from 'react'
import {
  fetchPrizeVault,
  fetchRecentDraws,
  fetchRecentWinners,
  fetchUserVaultAccount,
} from '../subgraph.js'

const POLL_MS = 60_000

function useSubgraphQuery(loadFn, deps = [], poll = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const result = await loadFn()
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    load()
    const id = poll ? setInterval(load, POLL_MS) : undefined
    return () => {
      cancelled = true
      if (id) clearInterval(id)
    }
  }, deps)

  return { data, loading, error }
}

/** Protocol-level vault stats from the subgraph (TWAB balance). */
export function useProtocolStatsSubgraph() {
  const { data, loading, error } = useSubgraphQuery(() => fetchPrizeVault(), [])
  return { vault: data, loading, error }
}

/** Recent draws and nested winners from the subgraph. */
export function useDrawHistory(limit = 10) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchRecentDraws(limit),
    [limit],
  )
  return { draws: data ?? [], loading, error }
}

/** Flat list of recent prize claims for the vault. */
export function useRecentWinners(limit = 15) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchRecentWinners(limit),
    [limit],
  )
  return { winners: data ?? [], loading, error }
}

/** Connected user's indexed vault account (TWAB balance). */
export function useUserVaultAccount(userAddress) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchUserVaultAccount(userAddress),
    [userAddress],
    Boolean(userAddress),
  )
  return { account: data, loading, error }
}
