const MORPHO_API = 'https://api.morpho.org/graphql'
const CHAIN_ID = 4663

const VAULT_QUERY = `
  query VaultSnapshot($address: String!, $chainId: Int!) {
    vaultV2ByAddress(address: $address, chainId: $chainId) {
      address
      name
      avgNetApy
      totalAssets
      totalAssetsUsd
      idleAssets
      idleAssetsUsd
      adapters(first: 10) {
        items {
          __typename
          assets
          assetsUsd
          ... on MorphoMarketV1Adapter {
            positions(first: 20) {
              items {
                market {
                  collateralAsset { symbol }
                  loanAsset { symbol }
                  state {
                    supplyApy
                    netSupplyApy
                  }
                }
                state {
                  supplyAssets
                  supplyAssetsUsd
                }
              }
            }
          }
        }
      }
    }
  }
`

function marketApy(market) {
  const state = market?.state
  if (!state) return null
  return state.netSupplyApy ?? state.supplyApy ?? null
}

function marketLabel(market) {
  const collateral = market?.collateralAsset?.symbol
  const loan = market?.loanAsset?.symbol
  if (collateral && loan) return `${collateral} / ${loan}`
  return collateral || loan || 'Market'
}

export function formatApyPercent(rate) {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

const CHAIN_SLUGS = { 4663: 'robinhood-chain' }

function vaultSlug(name) {
  if (!name) return 'vault'
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return slug || 'vault'
}

export function morphoVaultAppUrl(vaultAddress, chainId = CHAIN_ID, vaultName) {
  const chain = CHAIN_SLUGS[chainId] ?? `chain-${chainId}`
  const slug = vaultSlug(vaultName)
  return `https://app.morpho.org/${chain}/vault/${vaultAddress}/${slug}#overview`
}

export async function fetchMorphoVaultSnapshot(vaultAddress, chainId = CHAIN_ID) {
  const res = await fetch(MORPHO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: VAULT_QUERY,
      variables: { address: vaultAddress, chainId },
    }),
  })

  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'Morpho API error')
  }

  const vault = json.data?.vaultV2ByAddress
  if (!vault) return null

  const allocations = []
  let weightedApy = 0
  let allocatedUsd = 0

  for (const adapter of vault.adapters?.items ?? []) {
    if (adapter.__typename !== 'MorphoMarketV1Adapter') continue
    for (const position of adapter.positions?.items ?? []) {
      const usd = Number(position.state?.supplyAssetsUsd ?? 0)
      const apy = marketApy(position.market)
      if (usd <= 0) continue
      allocations.push({
        id: marketLabel(position.market),
        label: marketLabel(position.market),
        supplyUsd: usd,
        apy,
      })
      if (apy != null) weightedApy += usd * apy
      allocatedUsd += usd
    }
  }

  const idleUsd = Number(vault.idleAssetsUsd ?? 0)
  const totalUsd = Number(vault.totalAssetsUsd ?? 0) || allocatedUsd + idleUsd

  if (idleUsd > 0.0001) {
    allocations.push({
      id: 'idle',
      label: 'USDG (idle)',
      supplyUsd: idleUsd,
      apy: null,
    })
  }

  const withPct = allocations
    .map((row) => ({
      ...row,
      pct: totalUsd > 0 ? (row.supplyUsd / totalUsd) * 100 : 0,
    }))
    .sort((a, b) => b.supplyUsd - a.supplyUsd)

  const netApy = vault.avgNetApy ?? (allocatedUsd > 0 ? weightedApy / allocatedUsd : null)

  return {
    address: vault.address,
    name: vault.name,
    chainId,
    totalAssetsUsd: totalUsd,
    netApy,
    allocations: withPct,
  }
}
