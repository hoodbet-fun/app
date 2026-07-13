import { parseUnits } from 'viem'
import { AmountField } from './AmountField.jsx'
import { formatUsd } from '../format.js'
import { txExplorerUrl } from '../tx.js'

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
  chainMessage,
  switchingChain,
  onSwitchChain,
  vaultDepositBlocked,
  vaultBlockedMessage,
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

  let depositLabel = 'Deposit'
  if (txStep === 'approving' && isWalletPending) depositLabel = 'Confirm in wallet…'
  else if (txStep === 'approving' && isConfirming) depositLabel = 'Approving…'
  else if (txStep === 'depositing' && isWalletPending) depositLabel = 'Confirm in wallet…'
  else if (txStep === 'depositing' && isConfirming) depositLabel = 'Depositing…'
  else if (txStep === 'success' && isDeposit) depositLabel = 'Done ✓'
  else if (needsApproval && depositAmount) depositLabel = 'Approve & deposit'
  else if (depositAmount) depositLabel = `Deposit $${formatUsd(depositAmount)}`

  let withdrawLabel = withdrawAmount ? `Withdraw $${formatUsd(withdrawAmount)}` : 'Withdraw all'
  if (txStep === 'withdrawing' && isWalletPending) withdrawLabel = 'Confirm in wallet…'
  else if (txStep === 'withdrawing' && isConfirming) withdrawLabel = 'Confirming…'
  else if (txStep === 'success' && !isDeposit) withdrawLabel = 'Done ✓'

  const canDeposit = depositAmount && !depositExceeds && !isBusy && txStep !== 'success' && !wrongChain && !lowGas && !vaultDepositBlocked
  const canWithdraw = maxWithdraw && maxWithdraw > 0n && !withdrawExceeds && !isBusy && !wrongChain && !lowGas

  const statusLine = isWalletPending
    ? 'Confirm in your wallet'
    : isConfirming && txHash
      ? 'Confirming on-chain…'
      : txError
        ? null
        : null

  return (
    <div className="vault-panel">
      <div className="vault-panel-top">
        <div className="vault-mode-toggle vault-mode-compact">
          <button
            type="button"
            className={`vault-mode ${isDeposit ? 'active deposit' : ''}`}
            onClick={() => onModeChange('deposit')}
            disabled={isBusy}
          >
            ↓ Deposit
          </button>
          <button
            type="button"
            className={`vault-mode ${!isDeposit ? 'active withdraw' : ''}`}
            onClick={() => onModeChange('withdraw')}
            disabled={isBusy}
          >
            ↑ Withdraw
          </button>
        </div>
        <div className="position-row">
          <span>Position <strong>${formatUsd(positionUsd)}</strong></span>
          {isConnected && (
            <span>Wallet <strong>${formatUsd(walletUsd)}</strong></span>
          )}
        </div>
      </div>

      <div className="vault-panel-body">
        {(wrongChain || lowGas || vaultDepositBlocked) && (
          <div className="vault-alerts">
            {wrongChain && <p className="warn-banner-compact">{chainMessage}</p>}
            {vaultDepositBlocked && !wrongChain && (
              <p className="warn-banner-compact vault-blocked">{vaultBlockedMessage}</p>
            )}
            {lowGas && !wrongChain && !vaultDepositBlocked && (
              <p className="warn-inline">Need ETH for gas on Robinhood Chain</p>
            )}
          </div>
        )}

        <div className="vault-panel-main">
          {!isConnected ? (
            <div className="connect-compact-vault">
              <p>Connect wallet on Robinhood Chain</p>
              <button className="btn btn-primary btn-full" type="button" onClick={onConnect}>
                Connect wallet
              </button>
            </div>
          ) : wrongChain ? (
            <div className="connect-compact-vault">
              <p>Deposits only work on <strong>Robinhood Chain (4663)</strong>.</p>
              <button
                className="btn btn-primary btn-full"
                type="button"
                disabled={switchingChain}
                onClick={onSwitchChain}
              >
                {switchingChain ? 'Switching network…' : 'Switch to Robinhood Chain'}
              </button>
            </div>
          ) : isDeposit ? (
            <>
              <AmountField
                id="deposit-amount"
                label="Amount"
                value={depositAmount}
                onChange={onDepositAmountChange}
                maxBalance={walletBalance}
                disabled={isBusy}
                compact
                error={depositExceeds ? 'Insufficient balance' : null}
                hint={
                  allowanceLoading
                    ? 'Loading…'
                    : needsApproval && depositAmount && !depositExceeds
                      ? 'Approve once, then auto-deposit.'
                      : null
                }
              />

              {BUSY_STEPS.has(txStep) && (
                <div className="tx-steps tx-steps-compact">
                  <div className={`tx-step ${txStep === 'approving' ? 'active' : txStep === 'depositing' || txStep === 'success' ? 'done' : ''}`}>
                    <span>1</span> Approve
                  </div>
                  <div className={`tx-step ${txStep === 'depositing' ? 'active' : txStep === 'success' ? 'done' : ''}`}>
                    <span>2</span> Deposit
                  </div>
                </div>
              )}

              {statusLine && <p className="vault-status">{statusLine}</p>}
              {txHash && (
                <a className="tx-link-inline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  Blockscout →
                </a>
              )}
              {txError && <div className="error-banner error-inline">{txError}</div>}
            </>
          ) : (
            <>
              <AmountField
                id="withdraw-amount"
                label="Amount"
                value={withdrawAmount}
                onChange={onWithdrawAmountChange}
                maxBalance={maxWithdraw || 0n}
                disabled={isBusy || !maxWithdraw || maxWithdraw === 0n}
                compact
                error={withdrawExceeds ? 'Exceeds balance' : null}
                hint="No lock-up · exit lowers TWAB"
              />

              {statusLine && <p className="vault-status">{statusLine}</p>}
              {txHash && (
                <a className="tx-link-inline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  Blockscout →
                </a>
              )}
              {txError && <div className="error-banner error-inline">{txError}</div>}
            </>
          )}
        </div>

        {isConnected && !wrongChain && (
          <div className="vault-panel-foot">
            {isDeposit ? (
              <>
                <button
                  className="btn btn-primary btn-full"
                  type="button"
                  disabled={!canDeposit}
                  onClick={onDeposit}
                >
                  {depositLabel}
                </button>
                {isBusy && (
                  <button className="btn btn-ghost btn-full btn-sm" type="button" onClick={onResetTx}>
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  className="btn btn-outline btn-full"
                  type="button"
                  disabled={!canWithdraw}
                  onClick={onWithdraw}
                >
                  {withdrawLabel}
                </button>
                {isBusy && (
                  <button className="btn btn-ghost btn-full btn-sm" type="button" onClick={onResetTx}>
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
