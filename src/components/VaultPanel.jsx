import { parseUnits } from 'viem'
import { AmountField } from './AmountField.jsx'
import { formatUsd } from '../format.js'

const DEPOSIT_QUICK = ['10', '50', '100', '500']

export function VaultPanel({
  mode,
  onModeChange,
  isConnected,
  onConnect,
  walletBalance,
  walletUsd,
  maxWithdraw,
  depositAmount,
  onDepositAmountChange,
  withdrawAmount,
  onWithdrawAmountChange,
  needsApproval,
  txStep,
  isPending,
  onDeposit,
  onWithdraw,
  positionUsd,
}) {
  const isDeposit = mode === 'deposit'

  const depositExceeds = (() => {
    if (!depositAmount || !walletBalance) return false
    try {
      return parseUnits(depositAmount, 6) > walletBalance
    } catch {
      return true
    }
  })()

  const withdrawExceeds = (() => {
    if (!withdrawAmount || !maxWithdraw) return false
    try {
      return parseUnits(withdrawAmount, 6) > maxWithdraw
    } catch {
      return true
    }
  })()

  let depositLabel = 'Deposit USDG'
  if (txStep === 'approving') depositLabel = 'Step 1/2 — Approve USDG…'
  else if (txStep === 'depositing') depositLabel = 'Step 2/2 — Depositing…'
  else if (txStep === 'success' && isDeposit) depositLabel = 'Success ✓'
  else if (needsApproval && depositAmount) depositLabel = 'Approve & deposit'

  let withdrawLabel = withdrawAmount ? `Withdraw $${formatUsd(withdrawAmount)}` : 'Withdraw all'
  if (txStep === 'withdrawing') withdrawLabel = 'Withdrawing…'
  else if (txStep === 'success' && !isDeposit) withdrawLabel = 'Success ✓'

  const canDeposit = depositAmount && !depositExceeds && !isPending && txStep !== 'success'
  const canWithdraw = maxWithdraw && maxWithdraw > 0n && !withdrawExceeds && !isPending

  return (
    <div className="vault-panel">
      <div className="vault-mode-toggle">
        <button
          type="button"
          className={`vault-mode ${isDeposit ? 'active deposit' : ''}`}
          onClick={() => onModeChange('deposit')}
        >
          <span className="mode-icon">↓</span>
          Deposit
        </button>
        <button
          type="button"
          className={`vault-mode ${!isDeposit ? 'active withdraw' : ''}`}
          onClick={() => onModeChange('withdraw')}
        >
          <span className="mode-icon">↑</span>
          Withdraw
        </button>
      </div>

      <div className="vault-panel-body">
        <div className="position-banner">
          <div>
            <span className="position-label">HoodPot position</span>
            <strong className="position-value">${formatUsd(positionUsd)}</strong>
          </div>
          {isConnected && (
            <div className="position-secondary">
              <span>Wallet USDG</span>
              <strong>${formatUsd(walletUsd)}</strong>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="connect-prompt">
            <p>Connect on Robinhood Chain (4663) to {isDeposit ? 'deposit' : 'withdraw'}.</p>
            <button className="btn btn-primary btn-lg" type="button" onClick={onConnect}>
              Connect wallet
            </button>
          </div>
        ) : isDeposit ? (
          <>
            <AmountField
              id="deposit-amount"
              label="You deposit"
              value={depositAmount}
              onChange={onDepositAmountChange}
              maxBalance={walletBalance}
              quickAmounts={DEPOSIT_QUICK}
              disabled={isPending}
              error={depositExceeds ? 'Insufficient USDG balance' : null}
              hint={needsApproval && depositAmount && !depositExceeds ? 'One-time USDG approval, then deposit.' : null}
            />

            {(txStep === 'approving' || txStep === 'depositing') && (
              <div className="tx-steps">
                <div className={`tx-step ${txStep === 'approving' ? 'active' : 'done'}`}>
                  <span>1</span> Approve
                </div>
                <div className={`tx-step ${txStep === 'depositing' ? 'active' : ''}`}>
                  <span>2</span> Deposit
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-full"
              type="button"
              disabled={!canDeposit}
              onClick={onDeposit}
            >
              {depositLabel}
            </button>
          </>
        ) : (
          <>
            <AmountField
              id="withdraw-amount"
              label="You withdraw"
              value={withdrawAmount}
              onChange={onWithdrawAmountChange}
              maxBalance={maxWithdraw || 0n}
              disabled={isPending || !maxWithdraw || maxWithdraw === 0n}
              error={withdrawExceeds ? 'Exceeds available balance' : null}
              hint="No lock-up. Early exit lowers TWAB for the current draw."
            />

            <button
              className="btn btn-outline btn-lg btn-full"
              type="button"
              disabled={!canWithdraw}
              onClick={onWithdraw}
            >
              {withdrawLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
