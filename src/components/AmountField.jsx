import { formatUnits, parseUnits } from 'viem'
import { formatUsd, formatUsdg } from '../format.js'

const PERCENTS = [25, 50, 75, 100]

function parseAmountUnits(value, decimals) {
  if (!value) return null
  try {
    return parseUnits(value, decimals)
  } catch {
    return null
  }
}

export function AmountField({
  id,
  label,
  value,
  onChange,
  maxBalance,
  decimals = 6,
  token = 'USDG',
  quickAmounts,
  disabled = false,
  error,
  hint,
}) {
  const maxStr = maxBalance != null ? formatUnits(maxBalance, decimals) : '0'
  const displayBalance = maxBalance != null ? formatUsdg(maxStr) : '0'

  function setPercent(percent) {
    if (!maxBalance || maxBalance === 0n) return
    const slice = (maxBalance * BigInt(percent)) / 100n
    onChange(formatUnits(slice, decimals))
  }

  function setMax() {
    if (!maxBalance || maxBalance === 0n) return
    onChange(maxStr)
  }

  const enteredUnits = parseAmountUnits(value, decimals)
  const exceeds = enteredUnits != null && maxBalance != null && enteredUnits > maxBalance
  const displayError = error || (exceeds ? `Max ${displayBalance} ${token}` : '')

  return (
    <div className={`amount-field ${displayError ? 'has-error' : ''}`}>
      <div className="amount-field-header">
        <label className="field-label" htmlFor={id}>{label}</label>
        <button
          type="button"
          className="balance-pill"
          onClick={setMax}
          disabled={disabled || !maxBalance || maxBalance === 0n}
        >
          Balance: <strong>{displayBalance}</strong> {token}
        </button>
      </div>

      <div className={`amount-input-wrap ${disabled ? 'disabled' : ''}`}>
        <span className="input-prefix">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        />
        <button type="button" className="btn-max" onClick={setMax} disabled={disabled || !maxBalance}>
          MAX
        </button>
        <span className="token-tag">{token}</span>
      </div>

      <div className="percent-row">
        {PERCENTS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip chip-percent"
            disabled={disabled || !maxBalance}
            onClick={() => setPercent(p)}
          >
            {p === 100 ? 'MAX' : `${p}%`}
          </button>
        ))}
      </div>

      {quickAmounts?.length > 0 && (
        <div className="quick-amounts">
          <span className="quick-label">Quick</span>
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              className="chip"
              disabled={disabled}
              onClick={() => onChange(q)}
            >
              ${q}
            </button>
          ))}
        </div>
      )}

      {hint && !displayError && <p className="field-hint">{hint}</p>}
      {displayError && <p className="field-error">{displayError}</p>}
    </div>
  )
}
