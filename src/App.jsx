import { useState } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useBalance,
  useWriteContract,
} from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { addresses, links, wagmiConfig } from './config.js'

const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
]

const erc4626Abi = [
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
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
  const [txError, setTxError] = useState('')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync, isPending } = useWriteContract()

  const vaultAddress = addresses.prizeVault || addresses.morphoVault

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

  const { data: vaultShares, refetch: refetchShares } = useReadContract({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const { data: vaultAssetsUser, refetch: refetchVaultAssets } = useReadContract({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: vaultShares ? [vaultShares] : undefined,
    query: { enabled: Boolean(vaultShares && vaultShares > 0n) },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.usdg,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: { enabled: Boolean(address && vaultAddress) },
  })

  const { data: multiplier } = useReadContract({
    address: addresses.hoodPoints,
    abi: pointsAbi,
    functionName: 'getReferralMultiplierBps',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && addresses.hoodPoints) },
  })

  const tvl = vaultAssets ? formatUnits(vaultAssets, 6) : '—'
  const vaultBalance = vaultAssetsUser ? formatUnits(vaultAssetsUser, 6) : '0'

  async function handleDeposit() {
    if (!address || !amount) return
    setTxError('')
    try {
      const assets = parseUnits(amount, 6)
      const needsApproval = !allowance || allowance < assets
      if (needsApproval) {
        const approveHash = await writeContractAsync({
          address: addresses.usdg,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, assets],
        })
        await waitForReceipt(approveHash)
        await refetchAllowance()
      }
      const depositHash = await writeContractAsync({
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'deposit',
        args: [assets, address],
      })
      await waitForReceipt(depositHash)
      setAmount('')
      await refetchShares()
      await refetchVaultAssets()
    } catch (err) {
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  async function handleWithdrawAll() {
    if (!address || !vaultShares || vaultShares === 0n) return
    setTxError('')
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'redeem',
        args: [vaultShares, address, address],
      })
      await waitForReceipt(hash)
      await refetchShares()
      await refetchVaultAssets()
    } catch (err) {
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  async function waitForReceipt(hash) {
    await waitForTransactionReceipt(wagmiConfig, { hash })
  }

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
              <p>Wallet: {formatUnits(usdgBalance.value, usdgBalance.decimals)} USDG · Vault: {vaultBalance} shares</p>
            )}
            <div className="input-row">
              <input
                type="text"
                placeholder="USDG amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="btn btn-primary"
                type="button"
                disabled={!isConnected || !amount || isPending}
                onClick={handleDeposit}
              >
                {isPending ? 'Confirm in wallet…' : 'Deposit USDG'}
              </button>
            </div>
            {txError && <p style={{ color: '#ff6b6b' }}>{txError}</p>}
            <p className="address">Vault: {vaultAddress}</p>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="card">
            <h2>Withdraw</h2>
            <p>Withdraw your USDG anytime. No penalty on principal.</p>
            {isConnected && <p>Vault balance: {vaultBalance} USDG (shares)</p>}
            <button
              className="btn btn-outline"
              type="button"
              disabled={!isConnected || !vaultShares || vaultShares === 0n || isPending}
              onClick={handleWithdrawAll}
            >
              {isPending ? 'Confirm in wallet…' : 'Withdraw all'}
            </button>
            {txError && <p style={{ color: '#ff6b6b' }}>{txError}</p>}
          </div>
        )}

        {tab === 'prizes' && (
          <div className="card">
            <h2>Your prizes</h2>
            <p>Claim prizes from daily draws after PrizePool deploy.</p>
            <button className="btn btn-primary" type="button" disabled>
              Claim prize (pending PrizePool)
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
