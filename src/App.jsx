import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useBalance,
  useWriteContract,
  useChainId,
  useSwitchChain,
} from 'wagmi'
import { formatUnits, parseEther, parseUnits, zeroAddress } from 'viem'
import { readContract } from 'wagmi/actions'
import { addresses, links, robinhoodChain, wagmiConfig } from './config.js'
import { claimerAbi, erc20Abi, erc4626Abi, pointsAbi, prizePoolAbi } from './abis.js'
import { explorerAddress, formatCountdown, formatUsd, shortenAddress } from './format.js'
import { VaultPanel } from './components/VaultPanel.jsx'
import { useVaultTx } from './hooks/useVaultTx.js'
import { waitForTx } from './tx.js'

const TIER_NAMES = ['Scout', 'Hood', 'Legend', 'OG']
const TIER_LABELS = ['Canary', 'Tier 1', 'Tier 2', 'Grand']
const TABS = [
  { id: 'vault', label: 'Overview', icon: '◆' },
  { id: 'prizes', label: 'Prizes', icon: '★' },
]

function TierBadge({ address }) {
  const { data: tierName } = useReadContract({
    address: addresses.hoodPoints || undefined,
    abi: pointsAbi,
    functionName: 'getTierName',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && addresses.hoodPoints) },
  })
  return <span className="tier-badge">{tierName || 'Scout'}</span>
}

export default function App() {
  const [tab, setTab] = useState('vault')
  const [vaultMode, setVaultMode] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [claimable, setClaimable] = useState([])
  const [scanningPrizes, setScanningPrizes] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync, isPending } = useWriteContract()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const vaultAddress = addresses.prizeVault || addresses.morphoVault

  const { data: prizeBalance } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'accountedBalance',
  })

  const { data: openDrawId } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'getOpenDrawId',
  })

  const { data: lastAwardedDrawId } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'getLastAwardedDrawId',
  })

  const { data: drawClosesAt } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'drawClosesAt',
    args: openDrawId ? [openDrawId] : undefined,
    query: { enabled: Boolean(openDrawId) },
  })

  const { data: twabData } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'getVaultUserBalanceAndTotalSupplyTwab',
    args: address && openDrawId ? [vaultAddress, address, openDrawId, openDrawId] : undefined,
    query: { enabled: Boolean(address && openDrawId) },
  })

  const { data: vaultAssets } = useReadContract({
    address: addresses.morphoVault,
    abi: erc4626Abi,
    functionName: 'totalAssets',
  })

  const { data: usdgBalance, refetch: refetchUsdg } = useBalance({
    address,
    token: addresses.usdg,
    query: { enabled: Boolean(address) },
  })

  const { data: ethBalance } = useBalance({
    address,
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

  const { data: maxWithdraw } = useReadContract({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'maxWithdraw',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.usdg,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: {
      enabled: Boolean(address && vaultAddress),
      refetchInterval: 4_000,
    },
  })

  async function refreshBalances() {
    await Promise.all([refetchShares(), refetchVaultAssets(), refetchUsdg(), refetchAllowance()])
  }

  const {
    txStep,
    txHash,
    txError,
    setTxError,
    isWalletPending,
    isConfirming,
    isBusy,
    resetTx,
    startDeposit,
    startWithdraw,
  } = useVaultTx({
    wagmiConfig,
    address,
    vaultAddress,
    usdgAddress: addresses.usdg,
    refetchAllowance,
    refreshBalances,
  })

  const { data: multiplier } = useReadContract({
    address: addresses.hoodPoints || undefined,
    abi: pointsAbi,
    functionName: 'getReferralMultiplierBps',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && addresses.hoodPoints) },
  })

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const countdownSec = drawClosesAt ? Number(drawClosesAt) - now : null
  const jackpot = prizeBalance ? formatUnits(prizeBalance, 6) : null
  const tvl = vaultAssets ? formatUnits(vaultAssets, 6) : null
  const position = vaultAssetsUser ? formatUnits(vaultAssetsUser, 6) : '0'
  const walletUsd = usdgBalance ? formatUnits(usdgBalance.value, usdgBalance.decimals) : '0'

  const oddsPercent = useMemo(() => {
    if (!twabData) return null
    const [twab, total] = twabData
    if (!total || total === 0n) return null
    return (Number(twab) / Number(total)) * 100
  }, [twabData])

  const needsApproval = useMemo(() => {
    if (!amount || allowance === undefined) return false
    try {
      return allowance < parseUnits(amount, 6)
    } catch {
      return true
    }
  }, [amount, allowance])

  const wrongChain = isConnected && chainId !== robinhoodChain.id
  const lowGas = ethBalance && ethBalance.value < parseEther('0.00005')

  async function ensureRobinhoodChain() {
    if (chainId === robinhoodChain.id) return
    await switchChainAsync({ chainId: robinhoodChain.id })
  }

  async function submitContract(params) {
    return writeContractAsync({ ...params, chainId: robinhoodChain.id })
  }

  async function handleDeposit() {
    if (!address || !amount || !usdgBalance) return
    setTxError('')
    try {
      if (wrongChain) {
        await ensureRobinhoodChain()
      }
      if (lowGas) {
        setTxError('Not enough ETH on Robinhood Chain for gas. Add a small amount of ETH to your wallet.')
        return
      }
      await startDeposit({ amountStr: amount, usdgBalance })
    } catch (err) {
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  async function handleWithdraw() {
    if (!address) return
    setTxError('')
    try {
      if (wrongChain) {
        await ensureRobinhoodChain()
      }
      if (lowGas) {
        setTxError('Not enough ETH on Robinhood Chain for gas.')
        return
      }
      const max = maxWithdraw || vaultAssetsUser || 0n
      await startWithdraw({ amountStr: withdrawAmount, max })
    } catch (err) {
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  useEffect(() => {
    if (txStep === 'success' && vaultMode === 'deposit') setAmount('')
    if (txStep === 'success' && vaultMode === 'withdraw') setWithdrawAmount('')
  }, [txStep, vaultMode])

  async function scanClaimablePrizes() {
    if (!address || !lastAwardedDrawId || lastAwardedDrawId === 0) {
      setClaimable([])
      return
    }
    setScanningPrizes(true)
    const found = []
    try {
      for (let tier = 0; tier < 4; tier++) {
        for (let prizeIndex = 0; prizeIndex < 8; prizeIndex++) {
          try {
            const won = await readContract(wagmiConfig, {
              address: addresses.prizePool,
              abi: prizePoolAbi,
              functionName: 'isWinner',
              args: [vaultAddress, address, tier, prizeIndex],
            })
            if (won) found.push({ tier, prizeIndex })
          } catch {
            break
          }
        }
      }
      setClaimable(found)
    } finally {
      setScanningPrizes(false)
    }
  }

  useEffect(() => {
    if (tab === 'prizes' && isConnected) scanClaimablePrizes()
  }, [tab, isConnected, address, lastAwardedDrawId])

  async function handleClaimAll() {
    if (!address || claimable.length === 0) return
    setTxError('')
    setClaiming(true)
    try {
      const byTier = claimable.reduce((acc, item) => {
        if (!acc[item.tier]) acc[item.tier] = []
        acc[item.tier].push(item.prizeIndex)
        return acc
      }, {})

      for (const [tierStr, indices] of Object.entries(byTier)) {
        const tier = Number(tierStr)
        const hash = await submitContract({
          address: addresses.claimer,
          abi: claimerAbi,
          functionName: 'claimPrizes',
          args: [
            vaultAddress,
            tier,
            [address],
            [indices],
            zeroAddress,
            0n,
          ],
        })
        await waitForTx(wagmiConfig, hash)
      }
      await scanClaimablePrizes()
      await refreshBalances()
    } catch (err) {
      setTxError(err.shortMessage || err.message || 'Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <nav className="nav">
          <div className="nav-brand">
            <img src="/logo.png" alt="HoodBet" />
            <div>
              <span className="brand-title">hood<em>bet</em></span>
              <span className="brand-sub">HoodPot · No-loss lottery</span>
            </div>
          </div>
          <div className="nav-actions">
            <a className="nav-link" href={links.docs} target="_blank" rel="noreferrer">Docs</a>
            <a className="nav-link" href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
            {isConnected && address && <TierBadge address={address} />}
            {isConnected ? (
              <button className="btn btn-ghost" type="button" onClick={() => disconnect()}>
                {shortenAddress(address)}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                disabled={isConnecting}
                onClick={() => connect({ connector: connectors[0] })}
              >
                Connect wallet
              </button>
            )}
          </div>
        </nav>

        <div className="dashboard">
          <aside className="dashboard-side">
            <div className="side-header">
              <p className="eyebrow">Save together · Win together</p>
              <h1 className="side-title">
                HoodPot <span className="accent">no-loss lottery</span>
              </h1>
            </div>

            <div className="tabs tabs-side">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => { setTab(t.id); setTxError('') }}
                >
                  <span className="tab-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'vault' ? (
              <div className="side-stack">
                <div className="jackpot-card jackpot-compact">
                  <span className="jackpot-label">Prize pool</span>
                  <strong className="jackpot-value">${jackpot ? formatUsd(jackpot) : '—'}</strong>
                  <span className="jackpot-sub">USDG · daily draws</span>
                </div>

                <div className="stats-grid stats-compact">
                  <div className="stat-card">
                    <span className="stat-label">Vault TVL</span>
                    <strong>${tvl ? formatUsd(tvl) : '—'}</strong>
                  </div>
                  <div className="stat-card highlight">
                    <span className="stat-label">Next draw</span>
                    <strong>{countdownSec != null ? formatCountdown(countdownSec) : '—'}</strong>
                    <span className="stat-hint">#{openDrawId?.toString() || '—'}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Your position</span>
                    <strong>${formatUsd(position)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Your odds</span>
                    <strong>{oddsPercent != null ? `${oddsPercent < 0.0001 ? '<0.0001' : oddsPercent.toFixed(4)}%` : '—'}</strong>
                    {isConnected && <span className="stat-hint">{formatUsd(walletUsd)} wallet</span>}
                  </div>
                </div>

                <div className="info-grid info-compact">
                  <div className="info-card">
                    <h3>TWAB odds</h3>
                    <p>Longer deposits + larger balance = better chance each draw.</p>
                  </div>
                  <div className="info-card">
                    <h3>$HOOD tiers</h3>
                    <p>{TIER_NAMES.join(' → ')} — referral boosts at launch.</p>
                  </div>
                </div>

                <div className="contracts-strip contracts-compact">
                  <a href={explorerAddress(vaultAddress)} target="_blank" rel="noreferrer">Vault {shortenAddress(vaultAddress)}</a>
                  <a href={explorerAddress(addresses.prizePool)} target="_blank" rel="noreferrer">Pool {shortenAddress(addresses.prizePool)}</a>
                </div>
              </div>
            ) : (
              <div className="side-stack panel prizes-side">
                <div className="panel-head">
                  <h2>Prizes & claims</h2>
                  <p>
                    Draw #{lastAwardedDrawId?.toString() || '0'} last awarded.
                    {lastAwardedDrawId === 0n && ' First draw pending.'}
                  </p>
                </div>

                {!isConnected ? (
                  <div className="connect-prompt connect-compact">
                    <p>Connect wallet to scan for wins.</p>
                  </div>
                ) : scanningPrizes ? (
                  <p className="muted">Scanning on-chain…</p>
                ) : claimable.length > 0 ? (
                  <>
                    <div className="prize-wins">
                      {claimable.map((c) => (
                        <div key={`${c.tier}-${c.prizeIndex}`} className="prize-win-card">
                          <span className="prize-tier">{TIER_LABELS[c.tier] || `Tier ${c.tier}`}</span>
                          <strong>Prize #{c.prizeIndex + 1}</strong>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary btn-full"
                      type="button"
                      disabled={claiming || isBusy}
                      onClick={handleClaimAll}
                    >
                      {claiming ? 'Claiming…' : `Claim ${claimable.length} prize${claimable.length > 1 ? 's' : ''}`}
                    </button>
                  </>
                ) : (
                  <div className="empty-prizes empty-compact">
                    <p><strong>No prizes to claim.</strong></p>
                    <p className="muted">Keep deposited to build TWAB before the next draw.</p>
                    <button type="button" className="btn btn-ghost" onClick={scanClaimablePrizes}>Refresh</button>
                  </div>
                )}
              </div>
            )}
          </aside>

          <main className="dashboard-action">
            <div className="action-card panel">
              <div className="action-card-head">
                <h2>Deposit & withdraw</h2>
                <p>USDG into HoodPot — capital always withdrawable.</p>
              </div>
              <VaultPanel
                mode={vaultMode}
                onModeChange={(m) => { setVaultMode(m); resetTx() }}
                isConnected={isConnected}
                wrongChain={wrongChain}
                lowGas={lowGas}
                onConnect={() => connect({ connector: connectors[0] })}
                walletBalance={usdgBalance?.value}
                walletUsd={walletUsd}
                maxWithdraw={maxWithdraw}
                depositAmount={amount}
                onDepositAmountChange={setAmount}
                withdrawAmount={withdrawAmount}
                onWithdrawAmountChange={setWithdrawAmount}
                needsApproval={needsApproval}
                allowanceLoading={allowance === undefined}
                txStep={txStep}
                txHash={txHash}
                isWalletPending={isWalletPending}
                isConfirming={isConfirming}
                isBusy={isBusy}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
                onResetTx={resetTx}
                positionUsd={position}
                txError={txError}
              />
            </div>
          </main>
        </div>

        <footer className="footer footer-compact">
          <a href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
          <a href={links.docs} target="_blank" rel="noreferrer">Docs</a>
          <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={links.landing} target="_blank" rel="noreferrer">hoodbet.fun</a>
        </footer>
      </div>
    </div>
  )
}
