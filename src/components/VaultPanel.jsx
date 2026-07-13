import { parseUnits } from 'viem'
import { AmountField } from './AmountField.jsx'
import { formatUsd } from '../format.js'
import { txExplorerUrl } from '../tx.js'

const DEPOSIT_QUICK = ['10', '50', '100', '500']
const BUSY_STEPS = new Set(['approving', 'depositing', 'withdrawing'])

function parseAmount(value) {
  if (!value) return null
  try {
    return parseUnits(value, 6)
  } catch {
    return null
  }
}

export function VaultPanel({
  mode,
  onModeChange,
  isConnected,
  wrongChain,
  lowGas,
  onConnect,
  walletBalance,
  walletUsd,
  maxWithdraw,
  depositAmount,
  onDepositAmountChange,
  withdrawAmount,
  onWithdrawAmountChange,
  needsApproval,
  allowanceLoading,
  txStep,
  txHash,
  isWalletPending,
  isConfirming,
  isBusy,
  onDeposit,
  onWithdraw,
  onResetTx,
  positionUsd,
  txError,
}) {
  const isDeposit = mode === 'deposit'

  const depositUnits = parseAmount(depositAmount)
  const depositExceeds = depositUnits != null && walletBalance != null && depositUnits > walletBalance

  const withdrawUnits = parseAmount(withdrawAmount)
  const withdrawExceeds = withdrawUnits != null && maxWithdraw != null && withdrawUnits > maxWithdraw

  let depositLabel = 'Deposit USDG'
  if (txStep === 'approving' && isWalletPending) depositLabel = 'Confirm approve in wallet…'
  else if (txStep === 'approving' && isConfirming) depositLabel = 'Approval confirming on-chain…'
  else if (txStep === 'approving') depositLabel = 'Step 1/2 — Approve USDG'
  else if (txStep === 'depositing' && isWalletPending) depositLabel = 'Confirm deposit in wallet…'
  else if (txStep === 'depositing' && isConfirming) depositLabel = 'Deposit confirming on-chain…'
  else if (txStep === 'depositing') depositLabel = 'Step 2/2 — Depositing…'
  else if (txStep === 'success' && isDeposit) depositLabel = 'Success ✓'
  else if (needsApproval && depositAmount) depositLabel = 'Approve & deposit'
  else if (depositAmount) depositLabel = `Deposit $${formatUsd(depositAmount)}`

  let withdrawLabel = withdrawAmount ? `Withdraw $${formatUsd(withdrawAmount)}` : 'Withdraw all'
  if (txStep === 'withdrawing' && isWalletPending) withdrawLabel = 'Confirm in wallet…'
  else if (txStep === 'withdrawing' && isConfirming) withdrawLabel = 'Confirming on-chain…'
  else if (txStep === 'withdrawing') withdrawLabel = 'Withdrawing…'
  else if (txStep === 'success' && !isDeposit) withdrawLabel = 'Success ✓'

  const canDeposit = depositAmount && !depositExceeds && !isBusy && txStep !== 'success' && !wrongChain && !lowGas
  const canWithdraw = maxWithdraw && maxWithdraw > 0n && !withdrawExceeds && !isBusy && !wrongChain && !lowGas

  const showSteps = BUSY_STEPS.has(txStep) || txStep === 'success'

  return (
    <div className="vault-panel">
      <div className="vault-mode-toggle">
        <button
          type="button"
          className={`vault-mode ${isDeposit ? 'active deposit' : ''}`}
          onClick={() => onModeChange('deposit')}
          disabled={isBusy}
        >
          <span className="mode-icon">↓</span>
          Deposit
        </button>
        <button
          type="button"
          className={`vault-mode ${!isDeposit ? 'active withdraw' : ''}`}
          onClick={() => onModeChange('withdraw')}
          disabled={isBusy}
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

        {wrongChain && (
          <div className="warn-banner">
            Wrong network — switch to Robinhood Chain (4663) to continue.
          </div>
        )}

        {lowGas && !wrongChain && (
          <div className="warn-banner">
            Low ETH for gas. Keep a small amount of ETH on Robinhood Chain for transactions.
          </div>
        )}

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
              disabled={isBusy}
              error={depositExceeds ? 'Insufficient USDG balance' : null}
              hint={
                allowanceLoading
                  ? 'Loading allowance…'
                  : needsApproval && depositAmount && !depositExceeds
                    ? 'Approve once, then deposit runs automatically.'
                    : null
              }
            />

            {showSteps && (
              <div className="tx-steps">
                <div className={`tx-step ${txStep === 'approving' ? 'active' : txStep === 'depositing' || txStep === 'success' ? 'done' : ''}`}>
                  <span>1</span> Approve
                </div>
                <div className={`tx-step ${txStep === 'depositing' ? 'active' : txStep === 'success' ? 'done' : ''}`}>
                  <span>2</span> Deposit
                </div>
              </div>
            )}

            {isWalletPending && (
              <p className="wallet-prompt">Open your wallet and confirm the transaction.</p>
            )}

            {isConfirming && txHash && (
              <p className="wallet-prompt wallet-prompt-muted">Waiting for on-chain confirmation…</p>
            )}

            {txHash && (
              <p className="tx-link-row">
                <a href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  View on Blockscout →
                </a>
              </p>
            )}

            {txError && <div className="error-banner error-inline">{txError}</div>}

            <button
              className="btn btn-primary btn-lg btn-full"
              type="button"
              disabled={!canDeposit}
              onClick={onDeposit}
            >
              {depositLabel}
            </button>

            {isBusy && (
              <button className="btn btn-ghost btn-full tx-reset" type="button" onClick={onResetTx}>
                Cancel
              </button>
            )}
          </>
        ) : (
          <>
            <AmountField
              id="withdraw-amount"
              label="You withdraw"
              value={withdrawAmount}
              onChange={onWithdrawAmountChange}
              maxBalance={maxWithdraw || 0n}
              disabled={isBusy || !maxWithdraw || maxWithdraw === 0n}
              error={withdrawExceeds ? 'Exceeds available balance' : null}
              hint="No lock-up. Early exit lowers TWAB for the current draw."
            />

            {isWalletPending && (
              <p className="wallet-prompt">Open your wallet and confirm the transaction.</p>
            )}

            {txHash && (
              <p className="tx-link-row">
                <a href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  View on Blockscout →
                </a>
              </p>
            )}

            {txError && <div className="error-banner error-inline">{txError}</div>}

            <button
              className="btn btn-outline btn-lg btn-full"
              type="button"
              disabled={!canWithdraw}
              onClick={onWithdraw}
            >
              {withdrawLabel}
            </button>

            {isBusy && (
              <button className="btn btn-ghost btn-full tx-reset" type="button" onClick={onResetTx}>
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
