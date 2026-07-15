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
import { addresses, links, robinhoodChain, wagmiConfig } from './config.js'
import { claimerAbi, erc20Abi, erc4626Abi, pointsAbi, prizePoolAbi } from './abis.js'
import { explorerAddress, formatCountdown, formatTimestamp, formatUsd, shortenAddress } from './format.js'
import { ShareHoodPot } from './components/ShareHoodPot.jsx'
import { VaultPanel } from './components/VaultPanel.jsx'
import { HoodTokenCard } from './components/HoodTokenCard.jsx'
import { OnboardingFlow } from './components/OnboardingFlow.jsx'
import { UserDashboard } from './components/UserDashboard.jsx'
import { ProtocolOverview } from './components/ProtocolOverview.jsx'
import { PrizesPanel } from './components/PrizesPanel.jsx'
import { StackStrip } from './components/StackStrip.jsx'
import { useVaultTx } from './hooks/useVaultTx.js'
import { useDrawHistory, useProtocolStatsSubgraph, useRecentWinners, useUserVaultAccount } from './hooks/useSubgraph.js'
import { useMorphoVaultSnapshot } from './hooks/useMorphoVaultSnapshot.js'
import { useClaimablePrizes } from './hooks/useClaimablePrizes.js'
import { useLiveHarvesterAccrual } from './hooks/useLiveHarvesterAccrual.js'
import { waitForTx } from './tx.js'
import { chainMismatchMessage, ensureRobinhoodNetwork, getWalletChainId } from './chain.js'
const TIER_NAMES = ['Scout', 'Hood', 'Legend', 'OG']
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
  const [claiming, setClaiming] = useState(false)
  const [switchingChain, setSwitchingChain] = useState(false)
  const [walletChainId, setWalletChainId] = useState(null)

  const { address, isConnected, chainId: accountChainId } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync, isPending } = useWriteContract()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const vaultAddress = addresses.prizeVault || addresses.morphoVault

  const { data: prizeBalance, isLoading: prizeLoading } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'accountedBalance',
    query: { refetchInterval: 12_000 },
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

  const { data: firstDrawOpensAt } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'firstDrawOpensAt',
  })

  const { data: numberOfTiers } = useReadContract({
    address: addresses.prizePool,
    abi: prizePoolAbi,
    functionName: 'numberOfTiers',
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

  const { data: morphoIdleUsdg } = useReadContract({
    address: addresses.usdg,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [addresses.morphoVault],
  })

  const { data: usdgBalance, refetch: refetchUsdg } = useBalance({
    address,
    token: addresses.usdg,
    chainId: robinhoodChain.id,
    query: { enabled: Boolean(address) },
  })

  const { data: ethBalance } = useBalance({
    address,
    chainId: robinhoodChain.id,
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

  const { vault: subgraphVault } = useProtocolStatsSubgraph()
  const { snapshot: vaultSnapshot, loading: vaultApyLoading } = useMorphoVaultSnapshot(addresses.morphoVault)
  const liveHarvesterAccrual = useLiveHarvesterAccrual({
    tvlUsd: vaultAssets
      ? formatUnits(vaultAssets, 6)
      : subgraphVault?.balance != null
        ? formatUnits(BigInt(subgraphVault.balance), 6)
        : vaultSnapshot?.totalAssetsUsd ?? null,
    netApy: vaultSnapshot?.netApy,
    nowSec: now,
  })
  const {
    prizes: claimablePrizes,
    total: claimableTotal,
    loading: scanningPrizes,
    refresh: refreshClaimablePrizes,
  } = useClaimablePrizes({
    wagmiConfig,
    prizePool: addresses.prizePool,
    vaultAddress,
    userAddress: address,
    lastAwardedDrawId,
    numberOfTiers,
    enabled: isConnected,
  })
  const claimableTotalUsd = formatUnits(claimableTotal, 6)
  const { draws: subgraphDraws, loading: drawsLoading } = useDrawHistory(8)
  const { winners: recentWinners, loading: winnersLoading } = useRecentWinners(12)
  const { account: subgraphAccount } = useUserVaultAccount(address)

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isConnected || typeof window === 'undefined' || !window.ethereum) {
      setWalletChainId(null)
      return
    }

    let cancelled = false
    getWalletChainId()
      .then((id) => { if (!cancelled) setWalletChainId(id) })
      .catch(() => {})

    const onChainChanged = (hex) => setWalletChainId(Number(hex))
    window.ethereum.on('chainChanged', onChainChanged)
    return () => {
      cancelled = true
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [isConnected, accountChainId])

  const activeChainId = walletChainId ?? accountChainId ?? chainId
  const onRobinhood = isConnected && activeChainId === robinhoodChain.id

  const countdownSec = drawClosesAt ? Number(drawClosesAt) - now : null
  const jackpot =
    prizeBalance !== undefined ? formatUnits(prizeBalance, 6) : null
  const tvlOnChain = vaultAssets ? formatUnits(vaultAssets, 6) : null
  const tvlFromSubgraph = subgraphVault?.balance != null
    ? formatUnits(BigInt(subgraphVault.balance), 6)
    : null
  const tvl = tvlOnChain ?? tvlFromSubgraph
  const positionOnChain = vaultAssetsUser ? formatUnits(vaultAssetsUser, 6) : null
  const positionFromSubgraph = subgraphAccount?.balance != null
    ? formatUnits(BigInt(subgraphAccount.balance), 6)
    : null
  const position = positionOnChain ?? positionFromSubgraph ?? '0'
  const lastSubgraphDraw = subgraphDraws[0] ?? null
  const walletUsd = usdgBalance ? formatUnits(usdgBalance.value, usdgBalance.decimals) : '0'

  // maxWithdraw is often 0 on Morpho-backed vaults; estimate instant slice from idle Morpho cash.
  const instantWithdrawMax = useMemo(() => {
    if (!vaultAssetsUser || !vaultAssets || vaultAssets === 0n || morphoIdleUsdg == null) return 0n
    const share = (morphoIdleUsdg * vaultAssetsUser) / vaultAssets
    return share > 0n ? (share * 90n) / 100n : 0n
  }, [morphoIdleUsdg, vaultAssetsUser, vaultAssets])

  const withdrawableMax = maxWithdraw > 0n ? maxWithdraw : instantWithdrawMax
  const withdrawLiquidityLimited = Boolean(
    vaultAssetsUser && vaultAssetsUser > 0n && withdrawableMax < vaultAssetsUser,
  )

  const oddsPercent = useMemo(() => {
    if (!twabData) return null
    const [twab, total] = twabData
    if (!total || total === 0n) return null
    return (Number(twab) / Number(total)) * 100
  }, [twabData])

  const { data: yieldBuffer } = useReadContract({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'yieldBuffer',
  })

  const { data: maxDeposit } = useReadContract({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'maxDeposit',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const vaultDepositBlocked = yieldBuffer === 0n

  const needsApproval = useMemo(() => {
    if (!amount || allowance === undefined) return false
    try {
      return allowance < parseUnits(amount, 6)
    } catch {
      return true
    }
  }, [amount, allowance])

  const wrongChain = isConnected && activeChainId !== robinhoodChain.id
  const lowGas = onRobinhood && ethBalance && ethBalance.value < parseEther('0.00005')
  const chainMessage = wrongChain ? chainMismatchMessage(activeChainId) : ''

  const firstDrawOpen = firstDrawOpensAt != null && now >= Number(firstDrawOpensAt)
  const hasAwardedDraws = lastAwardedDrawId != null && lastAwardedDrawId > 0n
  const firstDrawLabel = firstDrawOpensAt
    ? formatTimestamp(Number(firstDrawOpensAt))
    : 'soon'
  const firstDrawCountdownSec = firstDrawOpensAt && !firstDrawOpen
    ? Math.max(0, Number(firstDrawOpensAt) - now)
    : null
  const hasUsdg = Boolean(usdgBalance && usdgBalance.value > 0n)
  const hasGas = Boolean(onRobinhood && ethBalance && ethBalance.value >= parseEther('0.00005'))
  const hasPosition = Number(position) > 0
  const depositReady = isConnected && onRobinhood && hasUsdg && hasGas && !vaultDepositBlocked

  async function handleSwitchChain() {
    setTxError('')
    setSwitchingChain(true)
    try {
      await ensureRobinhoodNetwork({ switchChainAsync, currentChainId: activeChainId })
      const id = await getWalletChainId()
      setWalletChainId(id)
    } catch (err) {
      const msg = err?.shortMessage || err?.message || 'Could not switch network'
      setTxError(/rejected|denied|cancel/i.test(msg) ? 'Network switch cancelled in wallet.' : msg)
    } finally {
      setSwitchingChain(false)
    }
  }

  async function requireRobinhoodChain() {
    if (activeChainId === robinhoodChain.id) return true
    await ensureRobinhoodNetwork({ switchChainAsync, currentChainId: activeChainId })
    const id = await getWalletChainId()
    setWalletChainId(id)
    if (id !== robinhoodChain.id) {
      setTxError('Approve the network switch in your wallet, then try again.')
      return false
    }
    return true
  }

  async function submitContract(params) {
    return writeContractAsync({ ...params, chainId: robinhoodChain.id })
  }

  async function handleDeposit() {
    if (!address || !amount || !usdgBalance) return
    setTxError('')
    try {
      if (!(await requireRobinhoodChain())) return
      if (lowGas) {
        setTxError('Not enough ETH on Robinhood Chain for gas. Add a small amount of ETH to your wallet.')
        return
      }
      await startDeposit({ amountStr: amount, usdgBalance })
    } catch (err) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed'
      if (/chain.*does not match|wrong network|chain id/i.test(msg)) {
        setTxError(chainMismatchMessage(activeChainId))
      } else {
        setTxError(/rejected|denied|cancel/i.test(msg) ? 'Transaction cancelled in wallet.' : msg)
      }
    }
  }

  async function handleWithdraw() {
    if (!address) return
    setTxError('')
    try {
      if (!(await requireRobinhoodChain())) return
      if (lowGas) {
        setTxError('Not enough ETH on Robinhood Chain for gas.')
        return
      }
      const max = withdrawableMax
      await startWithdraw({ amountStr: withdrawAmount, max })
    } catch (err) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed'
      if (/chain.*does not match|wrong network|chain id/i.test(msg)) {
        setTxError(chainMismatchMessage(activeChainId))
      } else {
        setTxError(/rejected|denied|cancel/i.test(msg) ? 'Transaction cancelled in wallet.' : msg)
      }
    }
  }

  useEffect(() => {
    if (txStep === 'success' && vaultMode === 'deposit') setAmount('')
    if (txStep === 'success' && vaultMode === 'withdraw') setWithdrawAmount('')
  }, [txStep, vaultMode])

  async function handleClaimAll() {
    if (!address || claimablePrizes.length === 0) return
    setTxError('')
    setClaiming(true)
    try {
      const byTier = claimablePrizes.reduce((acc, item) => {
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
      await refreshClaimablePrizes()
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
              <StackStrip className="stack-strip-nav" />
            </div>
          </div>
          <div className="nav-actions">
            <a className="nav-link" href={links.docs} target="_blank" rel="noreferrer">Docs</a>
            <a className="nav-link" href={links.x} target="_blank" rel="noreferrer">X</a>
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
                  {t.id === 'prizes' && claimablePrizes.length > 0 && (
                    <span className="tab-badge">{claimablePrizes.length}</span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'vault' ? (
              <div className="side-stack">
                <ProtocolOverview
                  jackpot={jackpot}
                  pendingHarvesterUsd={liveHarvesterAccrual.pendingUsd}
                  onChainPendingHarvesterUsd={liveHarvesterAccrual.onChainPendingUsd}
                  isLiveEstimate={liveHarvesterAccrual.isLiveEstimate}
                  tvl={tvl}
                  countdownSec={countdownSec}
                  openDrawId={openDrawId}
                  drawsStarted={firstDrawOpen || hasAwardedDraws}
                  firstDrawLabel={firstDrawLabel}
                  firstDrawCountdownSec={firstDrawCountdownSec}
                  netApy={vaultSnapshot?.netApy}
                  apyLoading={vaultApyLoading}
                  vaultSnapshot={vaultSnapshot}
                  prizeLoading={prizeLoading || liveHarvesterAccrual.loading}
                />

                <UserDashboard
                  isConnected={isConnected}
                  positionUsd={position}
                  walletUsd={walletUsd}
                  oddsPercent={oddsPercent}
                  drawsStarted={firstDrawOpen || hasAwardedDraws}
                  firstDrawLabel={firstDrawLabel}
                  claimableTotalUsd={claimableTotalUsd}
                  claimableCount={claimablePrizes.length}
                  scanningPrizes={scanningPrizes}
                  onGoPrizes={() => setTab('prizes')}
                />

                <div className="share-row">
                  <ShareHoodPot />
                  <a className="btn btn-ghost btn-sm" href={links.morphoVault} target="_blank" rel="noreferrer">
                    Morpho vault
                  </a>
                </div>

                <div className="info-grid info-compact">
                  <div className="info-card">
                    <h3>How it works</h3>
                    <p>Deposit USDG → earn draw entries → win prizes from the pool. Your deposit is always yours.</p>
                  </div>
                  <div className="info-card">
                    <h3>$HOOD tiers</h3>
                    <p>{TIER_NAMES.join(' → ')} — optional boosts for future products.</p>
                  </div>
                </div>

                <div className="contracts-strip contracts-compact">
                  <a href={explorerAddress(vaultAddress)} target="_blank" rel="noreferrer">Vault {shortenAddress(vaultAddress)}</a>
                  <a href={explorerAddress(addresses.prizePool)} target="_blank" rel="noreferrer">Pool {shortenAddress(addresses.prizePool)}</a>
                </div>
              </div>
            ) : (
              <div className="side-stack">
                <PrizesPanel
                isConnected={isConnected}
                onConnect={() => connect({ connector: connectors[0] })}
                lastAwardedDrawId={lastAwardedDrawId}
                lastSubgraphDraw={lastSubgraphDraw}
                firstDrawLabel={firstDrawLabel}
                drawsStarted={firstDrawOpen || hasAwardedDraws}
                claimablePrizes={claimablePrizes}
                claimableTotalUsd={claimableTotalUsd}
                scanningPrizes={scanningPrizes}
                claiming={claiming}
                isBusy={isBusy}
                onClaimAll={handleClaimAll}
                onRefresh={refreshClaimablePrizes}
                recentWinners={recentWinners}
                winnersLoading={winnersLoading}
                subgraphDraws={subgraphDraws}
                drawsLoading={drawsLoading}
                />
              </div>
            )}
          </aside>

          <main className="dashboard-action">
            <OnboardingFlow
              isConnected={isConnected}
              onRobinhood={onRobinhood}
              hasGas={hasGas}
              hasUsdg={hasUsdg}
              hasPosition={hasPosition}
              walletUsd={walletUsd}
              positionUsd={position}
              onConnect={() => connect({ connector: connectors[0] })}
              onSwitchChain={handleSwitchChain}
              switchingChain={switchingChain}
              isConnecting={isConnecting}
            />
            <div className="action-card panel">
              <VaultPanel
                mode={vaultMode}
                onModeChange={(m) => { setVaultMode(m); resetTx() }}
                isConnected={isConnected}
                depositReady={depositReady}
                wrongChain={wrongChain}
                chainMessage={chainMessage}
                switchingChain={switchingChain}
                vaultDepositBlocked={vaultDepositBlocked}
                onSwitchChain={handleSwitchChain}
                lowGas={lowGas}
                onConnect={() => connect({ connector: connectors[0] })}
                walletBalance={usdgBalance?.value}
                walletUsd={walletUsd}
                maxWithdraw={withdrawableMax}
                positionTotal={vaultAssetsUser ?? 0n}
                withdrawLiquidityLimited={withdrawLiquidityLimited}
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
            <HoodTokenCard className="hood-token-card-compact panel" />
          </main>
        </div>

        <footer className="footer footer-compact">
          <a href={links.x} target="_blank" rel="noreferrer">X</a>
          <a href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
          <a href={links.docs} target="_blank" rel="noreferrer">Docs</a>
          <a href={links.morphoVault} target="_blank" rel="noreferrer">Morpho</a>
          <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={links.landing} target="_blank" rel="noreferrer">hoodbet.fun</a>
        </footer>
      </div>
    </div>
  )
}
