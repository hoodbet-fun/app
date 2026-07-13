import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useBalance,
  useWriteContract,
} from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress } from 'viem'
import { readContract } from 'wagmi/actions'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { addresses, links, wagmiConfig } from './config.js'
import { claimerAbi, erc20Abi, erc4626Abi, pointsAbi, prizePoolAbi } from './abis.js'
import { explorerAddress, formatCountdown, formatUsd, shortenAddress } from './format.js'

const TIER_NAMES = ['Scout', 'Hood', 'Legend', 'OG']
const TIER_LABELS = ['Canary', 'Tier 1', 'Tier 2', 'Grand']
const TABS = [
  { id: 'deposit', label: 'Deposit', icon: '↓' },
  { id: 'withdraw', label: 'Withdraw', icon: '↑' },
  { id: 'prizes', label: 'Prizes', icon: '★' },
]

const QUICK_AMOUNTS = ['10', '50', '100', '500']

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
  const [tab, setTab] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [txError, setTxError] = useState('')
  const [txStep, setTxStep] = useState('idle')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [claimable, setClaimable] = useState([])
  const [scanningPrizes, setScanningPrizes] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync, isPending } = useWriteContract()

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
    query: { enabled: Boolean(address && vaultAddress) },
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
    if (!amount || !allowance) return true
    try {
      return allowance < parseUnits(amount, 6)
    } catch {
      return true
    }
  }, [amount, allowance])

  async function waitForReceipt(hash) {
    await waitForTransactionReceipt(wagmiConfig, { hash })
  }

  async function refreshBalances() {
    await Promise.all([refetchShares(), refetchVaultAssets(), refetchUsdg(), refetchAllowance()])
  }

  async function handleDeposit() {
    if (!address || !amount) return
    setTxError('')
    try {
      const assets = parseUnits(amount, 6)
      if (needsApproval) {
        setTxStep('approving')
        const approveHash = await writeContractAsync({
          address: addresses.usdg,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, maxUint256],
        })
        await waitForReceipt(approveHash)
        await refetchAllowance()
      }
      setTxStep('depositing')
      const depositHash = await writeContractAsync({
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'deposit',
        args: [assets, address],
      })
      await waitForReceipt(depositHash)
      setAmount('')
      await refreshBalances()
      setTxStep('success')
      setTimeout(() => setTxStep('idle'), 2500)
    } catch (err) {
      setTxStep('idle')
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  async function handleWithdraw() {
    if (!address) return
    setTxError('')
    try {
      const assets = withdrawAmount
        ? parseUnits(withdrawAmount, 6)
        : maxWithdraw || vaultAssetsUser || 0n
      if (assets === 0n) return
      setTxStep('withdrawing')
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'withdraw',
        args: [assets, address, address],
      })
      await waitForReceipt(hash)
      setWithdrawAmount('')
      await refreshBalances()
      setTxStep('success')
      setTimeout(() => setTxStep('idle'), 2500)
    } catch (err) {
      setTxStep('idle')
      setTxError(err.shortMessage || err.message || 'Transaction failed')
    }
  }

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
    setTxStep('claiming')
    try {
      const byTier = claimable.reduce((acc, item) => {
        if (!acc[item.tier]) acc[item.tier] = []
        acc[item.tier].push(item.prizeIndex)
        return acc
      }, {})

      for (const [tierStr, indices] of Object.entries(byTier)) {
        const tier = Number(tierStr)
        const hash = await writeContractAsync({
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
        await waitForReceipt(hash)
      }
      await scanClaimablePrizes()
      await refreshBalances()
      setTxStep('success')
      setTimeout(() => setTxStep('idle'), 2500)
    } catch (err) {
      setTxStep('idle')
      setTxError(err.shortMessage || err.message || 'Claim failed')
    }
  }

  const depositLabel = (() => {
    if (txStep === 'approving') return 'Step 1/2 — Approve USDG…'
    if (txStep === 'depositing') return 'Step 2/2 — Depositing…'
    if (txStep === 'success') return 'Done ✓'
    if (needsApproval && amount) return 'Approve & deposit'
    return 'Deposit USDG'
  })()

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

        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Save together · Win together</p>
            <h1>Deposit USDG.<br /><span className="accent">Keep it all. Win more.</span></h1>
            <p className="hero-desc">
              Your capital stays withdrawable. Yield and curator fees fuel the HoodPot jackpot — daily on-chain draws.
            </p>
          </div>
          <div className="jackpot-card">
            <span className="jackpot-label">Prize pool</span>
            <strong className="jackpot-value">${jackpot ? formatUsd(jackpot) : '—'}</strong>
            <span className="jackpot-sub">USDG accounted in pool</span>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Vault TVL</span>
            <strong>${tvl ? formatUsd(tvl) : '—'}</strong>
          </div>
          <div className="stat-card highlight">
            <span className="stat-label">Next draw</span>
            <strong>{countdownSec != null ? formatCountdown(countdownSec) : '—'}</strong>
            <span className="stat-hint">Draw #{openDrawId?.toString() || '—'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Your position</span>
            <strong>${formatUsd(position)}</strong>
            {isConnected && <span className="stat-hint">{formatUsd(walletUsd)} USDG in wallet</span>}
          </div>
          <div className="stat-card">
            <span className="stat-label">Your odds (this draw)</span>
            <strong>{oddsPercent != null ? `${oddsPercent < 0.0001 ? '<0.0001' : oddsPercent.toFixed(4)}%` : '—'}</strong>
            {multiplier ? <span className="stat-hint">{Number(multiplier) / 10000}× referral boost</span> : null}
          </div>
        </div>

        <div className="tabs">
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

        <div className="panel">
          {tab === 'deposit' && (
            <div className="panel-inner">
              <div className="panel-head">
                <h2>Enter HoodPot</h2>
                <p>Deposit USDG into the prize vault. TWAB starts counting immediately for the current draw.</p>
              </div>

              {!isConnected ? (
                <div className="connect-prompt">
                  <p>Connect your wallet on Robinhood Chain (4663) to deposit.</p>
                  <button className="btn btn-primary btn-lg" type="button" onClick={() => connect({ connector: connectors[0] })}>
                    Connect wallet
                  </button>
                </div>
              ) : (
                <>
                  <div className="balance-row">
                    <span>Wallet balance</span>
                    <strong>{formatUsd(walletUsd)} USDG</strong>
                  </div>

                  <label className="field-label" htmlFor="deposit-amount">Amount</label>
                  <div className="amount-input-wrap">
                    <input
                      id="deposit-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                    <button type="button" className="btn-max" onClick={() => setAmount(walletUsd)}>MAX</button>
                    <span className="token-tag">USDG</span>
                  </div>

                  <div className="quick-amounts">
                    {QUICK_AMOUNTS.map((q) => (
                      <button key={q} type="button" className="chip" onClick={() => setAmount(q)}>${q}</button>
                    ))}
                  </div>

                  {amount && needsApproval && (
                    <p className="step-hint">2-step flow: approve USDG once, then deposit (infinite approval).</p>
                  )}

                  <button
                    className="btn btn-primary btn-lg btn-full"
                    type="button"
                    disabled={!amount || isPending || txStep === 'success'}
                    onClick={handleDeposit}
                  >
                    {isPending || txStep === 'approving' || txStep === 'depositing' ? depositLabel : depositLabel}
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 'withdraw' && (
            <div className="panel-inner">
              <div className="panel-head">
                <h2>Withdraw</h2>
                <p>Exit anytime — no penalty on principal. Partial or full withdrawal.</p>
              </div>

              {!isConnected ? (
                <div className="connect-prompt">
                  <p>Connect wallet to withdraw your HoodPot position.</p>
                </div>
              ) : (
                <>
                  <div className="balance-row">
                    <span>Available to withdraw</span>
                    <strong>${formatUsd(position)} USDG</strong>
                  </div>

                  <label className="field-label" htmlFor="withdraw-amount">Amount (leave empty for max)</label>
                  <div className="amount-input-wrap">
                    <input
                      id="withdraw-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                    <button type="button" className="btn-max" onClick={() => setWithdrawAmount(position)}>MAX</button>
                    <span className="token-tag">USDG</span>
                  </div>

                  <button
                    className="btn btn-outline btn-lg btn-full"
                    type="button"
                    disabled={!vaultShares || vaultShares === 0n || isPending}
                    onClick={handleWithdraw}
                  >
                    {txStep === 'withdrawing' ? 'Withdrawing…' : withdrawAmount ? 'Withdraw amount' : 'Withdraw all'}
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 'prizes' && (
            <div className="panel-inner">
              <div className="panel-head">
                <h2>Prizes & claims</h2>
                <p>
                  Draw #{lastAwardedDrawId?.toString() || '0'} last awarded.
                  {lastAwardedDrawId === 0n && ' First draw pending — keep deposited to build TWAB.'}
                </p>
              </div>

              {!isConnected ? (
                <div className="connect-prompt">
                  <p>Connect wallet to scan for claimable prizes.</p>
                </div>
              ) : scanningPrizes ? (
                <p className="muted">Scanning on-chain for wins…</p>
              ) : claimable.length > 0 ? (
                <>
                  <div className="prize-wins">
                    {claimable.map((c) => (
                      <div key={`${c.tier}-${c.prizeIndex}`} className="prize-win-card">
                        <span className="prize-tier">{TIER_LABELS[c.tier] || `Tier ${c.tier}`}</span>
                        <strong>Prize #{c.prizeIndex + 1}</strong>
                        <span className="muted">Draw #{lastAwardedDrawId?.toString()}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary btn-lg btn-full"
                    type="button"
                    disabled={isPending}
                    onClick={handleClaimAll}
                  >
                    {txStep === 'claiming' ? 'Claiming…' : `Claim ${claimable.length} prize${claimable.length > 1 ? 's' : ''}`}
                  </button>
                </>
              ) : (
                <div className="empty-prizes">
                  <div className="empty-icon">★</div>
                  <p><strong>No claimable prizes right now.</strong></p>
                  <p className="muted">Stay deposited to grow TWAB. Winners are selected after each daily draw.</p>
                  <button type="button" className="btn btn-ghost" onClick={scanClaimablePrizes}>Refresh</button>
                </div>
              )}
            </div>
          )}

          {txError && <div className="error-banner">{txError}</div>}
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h3>How odds work</h3>
            <p>Time-weighted balance (TWAB) — longer deposits and larger balances improve your chance each draw.</p>
          </div>
          <div className="info-card">
            <h3>$HOOD tiers</h3>
            <p>{TIER_NAMES.join(' → ')} unlock referral boosts and early access when $HOOD launches on Virtuals.</p>
          </div>
        </div>

        <div className="contracts-strip">
          <a href={explorerAddress(vaultAddress)} target="_blank" rel="noreferrer">PrizeVault {shortenAddress(vaultAddress)}</a>
          <a href={explorerAddress(addresses.prizePool)} target="_blank" rel="noreferrer">PrizePool {shortenAddress(addresses.prizePool)}</a>
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
