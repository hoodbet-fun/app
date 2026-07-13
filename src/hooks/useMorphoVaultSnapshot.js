import { useEffect, useState } from 'react'
import { fetchMorphoVaultSnapshot } from '../morphoVault.js'

const POLL_MS = 60_000

export function useMorphoVaultSnapshot(vaultAddress) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!vaultAddress) {
      setSnapshot(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchMorphoVaultSnapshot(vaultAddress)
        if (!cancelled) {
          setSnapshot(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setSnapshot(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [vaultAddress])

  return { snapshot, loading, error }
}
