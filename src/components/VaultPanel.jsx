import { parseUnits } from 'viem'
import { AmountField } from './AmountField.jsx'
import { VAULT_DEPOSIT_BLOCKED, VAULT_WITHDRAW_LIQUIDITY_ERROR } from '../deposit.js'
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
  lowGas,
  onConnect,
  walletBalance,
  walletUsd,
  maxWithdraw,
  withdrawLiquidityLimited = false,
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
  const depositPaused = isDeposit && vaultDepositBlocked

  const depositUnits = parseAmount(depositAmount)
  const depositExceeds = depositUnits != null && walletBalance != null && depositUnits > walletBalance

  const withdrawUnits = parseAmount(withdrawAmount)
  const withdrawExceeds =
    withdrawUnits != null && maxWithdraw != null && maxWithdraw > 0n && withdrawUnits > maxWithdraw

  let depositLabel = 'Deposit'
  if (depositPaused) depositLabel = 'Deposits paused'
  else if (txStep === 'approving' && isWalletPending) depositLabel = 'Confirm in wallet…'
  else if (txStep === 'approving' && isConfirming) depositLabel = 'Approving…'
  else if (txStep === 'depositing' && isWalletPending) depositLabel = 'Confirm in wallet…'
  else if (txStep === 'depositing' && isConfirming) depositLabel = 'Depositing…'
  else if (txStep === 'success' && isDeposit) depositLabel = 'Done ✓'
  else if (needsApproval && depositAmount) depositLabel = 'Approve & deposit'
  else if (depositAmount) depositLabel = `Deposit $${formatUsd(depositAmount)}`

  let withdrawLabel = withdrawAmount ? `Withdraw $${formatUsd(withdrawAmount)}` : 'Withdraw all'
  if (withdrawLiquidityLimited && !withdrawAmount) withdrawLabel = 'Enter amount to withdraw'
  if (txStep === 'withdrawing' && isWalletPending) withdrawLabel = 'Confirm in wallet…'
  else if (txStep === 'withdrawing' && isConfirming) withdrawLabel = 'Confirming…'
  else if (txStep === 'success' && !isDeposit) withdrawLabel = 'Done ✓'

  const canDeposit = !depositPaused && depositAmount && !depositExceeds && !isBusy && txStep !== 'success' && !wrongChain && !lowGas
  const canWithdraw =
    !withdrawExceeds &&
    !isBusy &&
    !wrongChain &&
    !lowGas &&
    ((withdrawUnits != null && withdrawUnits > 0n) || (maxWithdraw > 0n && !withdrawAmount))

  const statusLine = isWalletPending
    ? 'Confirm in your wallet'
    : isConfirming && txHash
      ? 'Confirming on-chain…'
      : null

  const formDisabled = isBusy || depositPaused

  return (
    <div className="vault-panel">
      <div className="vault-panel-top">
        <div className="vault-segment" role="tablist" aria-label="Vault action">
          <button
            type="button"
            role="tab"
            aria-selected={isDeposit}
            className={`vault-segment-btn ${isDeposit ? 'active deposit' : ''}`}
            onClick={() => onModeChange('deposit')}
            disabled={isBusy}
          >
            <span className="vault-segment-icon" aria-hidden>↓</span>
            Deposit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isDeposit}
            className={`vault-segment-btn ${!isDeposit ? 'active withdraw' : ''}`}
            onClick={() => onModeChange('withdraw')}
            disabled={isBusy}
          >
            <span className="vault-segment-icon" aria-hidden>↑</span>
            Withdraw
          </button>
        </div>

        <div className="vault-stats">
          <div className="vault-stat vault-stat-primary">
            <span className="vault-stat-label">Position</span>
            <strong className="vault-stat-value">${formatUsd(positionUsd)}</strong>
          </div>
          {isConnected && (
            <div className="vault-stat">
              <span className="vault-stat-label">Wallet</span>
              <strong className="vault-stat-value">${formatUsd(walletUsd)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="vault-panel-body">
        {depositPaused && (
          <div className="vault-alert vault-alert-critical" role="alert">
            <div className="vault-alert-copy">
              <strong>{VAULT_DEPOSIT_BLOCKED.title}</strong>
              <p>{VAULT_DEPOSIT_BLOCKED.description}</p>
              <div className="vault-alert-actions">
                <a href={VAULT_DEPOSIT_BLOCKED.docsHref} target="_blank" rel="noreferrer">
                  {VAULT_DEPOSIT_BLOCKED.docsLabel} →
                </a>
                <a href={VAULT_DEPOSIT_BLOCKED.safeHref} target="_blank" rel="noreferrer">
                  {VAULT_DEPOSIT_BLOCKED.safeLabel} →
                </a>
              </div>
            </div>
          </div>
        )}

        {!depositPaused && (wrongChain || lowGas) && (
          <div className="vault-alerts">
            {wrongChain && <p className="vault-alert vault-alert-warn">{chainMessage}</p>}
            {lowGas && !wrongChain && (
              <p className="vault-alert vault-alert-warn">Need ETH for gas on Robinhood Chain.</p>
            )}
          </div>
        )}

        <div className={`vault-panel-main ${depositPaused ? 'is-paused' : ''}`}>
          {!isConnected ? (
            <div className="vault-empty-state">
              <p className="vault-empty-title">Connect your wallet</p>
              <p className="vault-empty-text">Use Robinhood Chain to deposit USDG into HoodPot.</p>
              <button className="btn btn-primary btn-full" type="button" onClick={onConnect}>
                Connect wallet
              </button>
            </div>
          ) : wrongChain ? (
            <div className="vault-empty-state">
              <p className="vault-empty-title">Wrong network</p>
              <p className="vault-empty-text">Deposits only work on <strong>Robinhood Chain (4663)</strong>.</p>
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
                disabled={formDisabled}
                compact
                error={depositExceeds ? 'Insufficient balance' : null}
                hint={
                  depositPaused
                    ? null
                    : allowanceLoading
                      ? 'Loading allowance…'
                      : needsApproval && depositAmount && !depositExceeds
                        ? 'One-time USDG approval, then deposit runs automatically.'
                        : 'No lock-up · withdraw anytime'
                }
              />

              {BUSY_STEPS.has(txStep) && (
                <div className="tx-steps tx-steps-compact">
                  <div className={`tx-step ${txStep === 'approving' ? 'active' : txStep === 'depositing' || txStep === 'success' ? 'done' : ''}`}>
                    <span>1</span> Approve USDG
                  </div>
                  <div className={`tx-step ${txStep === 'depositing' ? 'active' : txStep === 'success' ? 'done' : ''}`}>
                    <span>2</span> Deposit
                  </div>
                </div>
              )}

              {statusLine && <p className="vault-status">{statusLine}</p>}
              {txHash && (
                <a className="tx-link-inline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  View on Blockscout →
                </a>
              )}
              {txError && <div className="error-banner error-inline">{txError}</div>}
            </>
          ) : (
            <>
              {withdrawLiquidityLimited && (
                <div className="vault-alert" role="status">
                  <div className="vault-alert-copy">
                    <strong>Limited instant liquidity</strong>
                    <p>{VAULT_WITHDRAW_LIQUIDITY_ERROR}</p>
                  </div>
                </div>
              )}
              <AmountField
                id="withdraw-amount"
                label="Amount"
                value={withdrawAmount}
                onChange={onWithdrawAmountChange}
                maxBalance={maxWithdraw > 0n ? maxWithdraw : undefined}
                disabled={isBusy}
                compact
                error={withdrawExceeds ? 'Exceeds available withdraw' : null}
                hint={
                  withdrawLiquidityLimited
                    ? 'Enter a small amount — full balance may not be instant while Morpho lends USDG.'
                    : 'No lock-up · withdrawing lowers your TWAB odds'
                }
              />

              {statusLine && <p className="vault-status">{statusLine}</p>}
              {txHash && (
                <a className="tx-link-inline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  View on Blockscout →
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
                  className={`btn btn-primary btn-full ${depositPaused ? 'btn-disabled-look' : ''}`}
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
