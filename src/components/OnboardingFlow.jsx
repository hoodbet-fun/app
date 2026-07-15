import { UsdgOnramp } from './UsdgOnramp.jsx'

const STEPS = [
  { id: 'connect', label: 'Connect wallet' },
  { id: 'network', label: 'Robinhood Chain' },
  { id: 'funds', label: 'USDG + gas' },
  { id: 'deposit', label: 'Deposit' },
]

function stepState(stepId, ctx) {
  const { isConnected, onRobinhood, hasGas, hasUsdg, hasPosition } = ctx
  switch (stepId) {
    case 'connect':
      if (!isConnected) return 'current'
      return 'done'
    case 'network':
      if (!isConnected) return 'upcoming'
      if (!onRobinhood) return 'current'
      return 'done'
    case 'funds':
      if (!isConnected || !onRobinhood) return 'upcoming'
      if (hasPosition) return 'done'
      if (!hasUsdg || !hasGas) return 'current'
      return 'done'
    case 'deposit':
      if (!isConnected || !onRobinhood) return 'upcoming'
      if (hasPosition) return 'done'
      if (hasUsdg && hasGas) return 'current'
      return 'upcoming'
    default:
      return 'upcoming'
  }
}

export function OnboardingFlow({
  isConnected,
  onRobinhood,
  hasGas,
  hasUsdg,
  hasPosition,
  walletUsd,
  positionUsd,
  onConnect,
  onSwitchChain,
  switchingChain,
  isConnecting,
}) {
  const ctx = { isConnected, onRobinhood, hasGas, hasUsdg, hasPosition }
  const allDone = hasPosition && isConnected && onRobinhood

  if (allDone) {
    return (
      <div className="onboarding onboarding-done">
        <div className="onboarding-done-copy">
          <span className="onboarding-done-icon" aria-hidden>✓</span>
          <div>
            <strong>You&apos;re in the pool</strong>
            <p>${positionUsd} in HoodPot · add more or check odds in Overview</p>
          </div>
        </div>
      </div>
    )
  }

  const currentStep = STEPS.find((s) => stepState(s.id, ctx) === 'current')?.id

  return (
    <div className="onboarding">
      <p className="onboarding-title">Get started</p>
      <ol className="onboarding-steps">
        {STEPS.map((step, i) => {
          const state = stepState(step.id, ctx)
          return (
            <li key={step.id} className={`onboarding-step onboarding-step-${state}`}>
              <span className="onboarding-step-num" aria-hidden>
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="onboarding-step-label">{step.label}</span>
            </li>
          )
        })}
      </ol>

      {currentStep === 'connect' && (
        <div className="onboarding-action">
          <p className="onboarding-hint">Connect any EVM wallet to deposit USDG into HoodPot.</p>
          <button className="btn btn-primary btn-full" type="button" disabled={isConnecting} onClick={onConnect}>
            {isConnecting ? 'Connecting…' : 'Connect wallet'}
          </button>
        </div>
      )}

      {currentStep === 'network' && (
        <div className="onboarding-action">
          <p className="onboarding-hint">HoodPot runs on <strong>Robinhood Chain (4663)</strong>. Switch network to continue.</p>
          <button className="btn btn-primary btn-full" type="button" disabled={switchingChain} onClick={onSwitchChain}>
            {switchingChain ? 'Switching…' : 'Switch to Robinhood Chain'}
          </button>
        </div>
      )}

      {currentStep === 'funds' && (
        <div className="onboarding-action">
          <p className="onboarding-hint">
            {!hasUsdg && !hasGas && 'You need USDG to deposit and a little ETH for gas on Robinhood Chain.'}
            {!hasUsdg && hasGas && `Wallet balance: $${walletUsd} USDG. Get USDG on chain 4663 before depositing.`}
            {hasUsdg && !hasGas && 'You have USDG but need a small amount of ETH for transaction fees.'}
          </p>
          <ul className="onboarding-checklist">
            <li className={hasUsdg ? 'ok' : 'missing'}>
              <span>USDG in wallet</span>
              <strong>${walletUsd}</strong>
            </li>
            <li className={hasGas ? 'ok' : 'missing'}>
              <span>ETH for gas</span>
              <strong>{hasGas ? 'Ready' : 'Low'}</strong>
            </li>
          </ul>
          {!hasUsdg && hasGas && <UsdgOnramp defaultTarget="usdg" />}
        </div>
      )}

      {currentStep === 'deposit' && (
        <div className="onboarding-action">
          <p className="onboarding-hint">
            Enter an amount below and confirm. Your principal stays withdrawable — only yield funds prizes.
          </p>
        </div>
      )}
    </div>
  )
}
