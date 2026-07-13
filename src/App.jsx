import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { addresses, links } from './config.js'

const erc4626Abi = [
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
]

const pointsAbi = [
  { name: 'getTierName', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'string' }] },
  { name: 'getReferralMultiplierBps', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint16' }] },
]

const TIER_NAMES = ['Scout', 'Hood', 'Legend', 'OG']

const TABS = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'prizes', label: 'Prizes' },
]

function TierBadge({ address }) {
  const { data: tierName } = useReadContract({
    address: addresses.hoodPoints,
    abi: pointsAbi,
    functionName: 'getTierName',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && addresses.hoodPoints) },
  })

  if (!addresses.hoodPoints) {
    return <span className="tier-badge">Scout</span>
  }

  return <span className="tier-badge">{tierName || 'Scout'}</span>
}

export default function App() {
  const [tab, setTab] = useState('deposit')
  const [amount, setAmount] = useState('')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: vaultAssets } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'totalAssets',
  })

  const { data: usdgBalance } = useBalance({
    address,
    token: addresses.usdg,
    query: { enabled: Boolean(address) },
  })

  const { data: multiplier } = useReadContract({
    address: addresses.hoodPoints,
    abi: pointsAbi,
    functionName: 'getReferralMultiplierBps',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && addresses.hoodPoints) },
  })

  const tvl = vaultAssets ? formatUnits(vaultAssets, 6) : '—'

  return (
    <div className="app">
      <div className="container">
        <nav className="nav">
          <div className="nav-brand">
            <img src="/logo.png" alt="HoodBet" />
            <span>hood<em>bet</em> HoodPot</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a className="nav-link" href={links.docs} target="_blank" rel="noreferrer">Docs</a>
            <a className="nav-link" href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
            <a className="nav-link" href={links.landing} target="_blank" rel="noreferrer">hoodbet.fun</a>
            {isConnected && address && <TierBadge address={address} />}
            {isConnected ? (
              <button className="btn btn-outline" type="button" onClick={() => disconnect()}>
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => connect({ connector: connectors[0] })}>
                Connect wallet
              </button>
            )}
          </div>
        </nav>

        <div className="stats" style={{ marginBottom: '1.5rem' }}>
          <div className="stat card" style={{ margin: 0 }}>
            <strong>${tvl}</strong>
            <span>Vault TVL</span>
          </div>
          <div className="stat card" style={{ margin: 0 }}>
            <strong>USDG</strong>
            <span>Prize token</span>
          </div>
          <div className="stat card" style={{ margin: 0 }}>
            <strong>24h</strong>
            <span>Next draw</span>
          </div>
          {multiplier && (
            <div className="stat card" style={{ margin: 0 }}>
              <strong>{Number(multiplier) / 10000}×</strong>
              <span>Referral boost</span>
            </div>
          )}
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'deposit' && (
          <div className="card">
            <h2>Enter HoodPot</h2>
            <p>Deposit USDG into the Morpho vault. Your capital stays withdrawable. Yield fuels the jackpot.</p>
            {isConnected && usdgBalance && (
              <p>Balance: {formatUnits(usdgBalance.value, usdgBalance.decimals)} USDG</p>
            )}
            <div className="input-row">
              <input
                type="text"
                placeholder="USDG amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button className="btn btn-primary" type="button" disabled={!isConnected || !addresses.prizeVault}>
                {addresses.prizeVault ? 'Deposit' : 'PrizeVault pending deploy'}
              </button>
            </div>
            <p className="address">Morpho vault: {addresses.morphoVault}</p>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="card">
            <h2>Withdraw</h2>
            <p>Withdraw your USDG anytime. No penalty on principal.</p>
            <button className="btn btn-outline" type="button" disabled={!isConnected}>
              Withdraw all
            </button>
          </div>
        )}

        {tab === 'prizes' && (
          <div className="card">
            <h2>Your prizes</h2>
            <p>Claim prizes from daily draws. Connected to subgraph after deploy.</p>
            <button className="btn btn-primary" type="button" disabled={!isConnected}>
              Claim prize
            </button>
          </div>
        )}

        <div className="card">
          <h2>Hold $HOOD — tiers {TIER_NAMES.join(' → ')}</h2>
          <p>
            Agent token on{' '}
            <a href="https://www.virtuals.io/" target="_blank" rel="noreferrer">Virtuals.io</a>.
            {' '}Holding unlocks referral boost and early access.
          </p>
        </div>

        <footer className="footer">
          <a href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
          <a href={links.docs} target="_blank" rel="noreferrer">Docs</a>
          <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={links.landing} target="_blank" rel="noreferrer">hoodbet.fun</a>
        </footer>
      </div>
    </div>
  )
}
