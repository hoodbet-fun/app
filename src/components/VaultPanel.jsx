import { formatUnits, parseUnits } from 'viem'
import { AmountField } from './AmountField.jsx'
import { UsdgOnramp } from './UsdgOnramp.jsx'
import { VAULT_DEPOSIT_BLOCKED, VAULT_WITHDRAW_LIQUIDITY_ERROR, VAULT_WITHDRAW_LIQUIDITY_HINT } from '../deposit.js'
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
  depositReady = false,
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
  positionTotal,
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
          {!isConnected || wrongChain ? (
            <div className="vault-empty-state vault-empty-muted">
              <p className="vault-empty-title">Deposit & withdraw</p>
              <p className="vault-empty-text">Complete the setup steps above to {isDeposit ? 'deposit' : 'withdraw'}.</p>
            </div>
          ) : isDeposit && !depositReady && !depositPaused ? (
            <div className="vault-empty-state vault-empty-muted vault-empty-funding">
              <p className="vault-empty-title">Almost ready</p>
              <p className="vault-empty-text">
                {lowGas
                  ? 'Add a small amount of ETH on Robinhood Chain for gas.'
                  : `You need USDG in your wallet (currently $${formatUsd(walletUsd)}).`}
              </p>
              {!lowGas && <UsdgOnramp compact defaultTarget="usdg" />}
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
                        : 'Principal stays yours · only yield funds prizes'
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
                    <p>
                      {VAULT_WITHDRAW_LIQUIDITY_HINT}
                      {positionTotal > 0n && maxWithdraw > 0n && (
                        <>
                          {' '}
                          Position {formatUsd(formatUnits(positionTotal, 6))} · instant up to ~
                          {formatUsd(formatUnits(maxWithdraw, 6))} now.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
              <AmountField
                id="withdraw-amount"
                label="Amount"
                value={withdrawAmount}
                onChange={onWithdrawAmountChange}
                maxBalance={maxWithdraw > 0n ? maxWithdraw : undefined}
                balanceLabel={withdrawLiquidityLimited ? 'Instant max' : 'Available'}
                quickAmounts={withdrawLiquidityLimited ? ['0.001'] : undefined}
                disabled={isBusy}
                compact
                error={withdrawExceeds ? 'Exceeds instant liquidity — try less' : null}
                hint={
                  withdrawLiquidityLimited
                    ? 'Start with $0.001 or less. The rest of your position unlocks as Morpho liquidity returns.'
                    : 'No lock-up · withdrawing lowers your TWAB odds'
                }
              />

              {statusLine && <p className="vault-status">{statusLine}</p>}
              {txHash && (
                <a className="tx-link-inline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
                  View on Blockscout →
                </a>
              )}
              {txError && txError !== VAULT_WITHDRAW_LIQUIDITY_ERROR && (
                <div className="error-banner error-inline">{txError}</div>
              )}
            </>
          )}
        </div>

        {isConnected && !wrongChain && (isDeposit ? depositReady || depositPaused : true) && (
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
