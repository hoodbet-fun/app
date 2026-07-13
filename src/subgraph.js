import { addresses, subgraphUrl } from './config.js'

const VAULT_ID = addresses.prizeVault.toLowerCase()

async function graphqlQuery(query, variables = {}) {
  const res = await fetch(subgraphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

/** Prize vault stats (TWAB balance tracked by the subgraph). */
export async function fetchPrizeVault(vaultId = VAULT_ID) {
  const data = await graphqlQuery(
    `query PrizeVault($id: ID!) {
      prizeVault(id: $id) {
        id
        address
        name
        symbol
        balance
        delegateBalance
      }
    }`,
    { id: vaultId },
  )
  return data.prizeVault
}

/** Recent awarded draws, newest first. */
export async function fetchRecentDraws(first = 10) {
  const data = await graphqlQuery(
    `query RecentDraws($first: Int!) {
      draws(first: $first, orderBy: drawId, orderDirection: desc) {
        drawId
        numTiers
        winningRandomNumber
        reserve
        drawOpenedAt
        timestamp
        txHash
        prizeClaims(first: 50, orderBy: payout, orderDirection: desc) {
          id
          tier
          prizeIndex
          payout
          winner
          timestamp
        }
      }
    }`,
    { first },
  )
  return data.draws ?? []
}

/** Recent prize claims for the HoodPot vault. */
export async function fetchRecentWinners(first = 20, vaultId = VAULT_ID) {
  const data = await graphqlQuery(
    `query RecentWinners($first: Int!, $vault: Bytes!) {
      prizeClaims(
        first: $first
        orderBy: timestamp
        orderDirection: desc
        where: { prizeVault: $vault }
      ) {
        id
        tier
        prizeIndex
        payout
        claimReward
        winner
        recipient
        timestamp
        txHash
        draw {
          drawId
        }
      }
    }`,
    { first, vault: vaultId },
  )
  return data.prizeClaims ?? []
}

/** User TWAB account in the prize vault (if indexed). */
export async function fetchUserVaultAccount(userAddress, vaultId = VAULT_ID) {
  if (!userAddress) return null
  const userId = userAddress.toLowerCase()
  const data = await graphqlQuery(
    `query UserAccount($userId: ID!, $vault: Bytes!) {
      user(id: $userId) {
        address
        accounts(where: { prizeVault: $vault }) {
          id
          balance
          delegateBalance
        }
      }
    }`,
    { userId, vault: vaultId },
  )
  const accounts = data.user?.accounts ?? []
  return accounts[0] ?? null
}
