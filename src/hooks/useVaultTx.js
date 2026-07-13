import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { maxUint256, parseUnits } from 'viem'
import { readContract, simulateContract } from 'wagmi/actions'
import { robinhoodChain } from '../config.js'
import { erc20Abi, erc4626Abi } from '../abis.js'
import { parseDepositError, VAULT_YIELD_BUFFER_ERROR } from '../deposit.js'

function txMessage(err) {
  return parseDepositError(err)
}

export function useVaultTx({
  wagmiConfig,
  address,
  vaultAddress,
  usdgAddress,
  refetchAllowance,
  refreshBalances,
}) {
  const [txStep, setTxStep] = useState('idle')
  const [txHash, setTxHash] = useState(undefined)
  const [txError, setTxError] = useState('')
  const depositAssetsRef = useRef(null)
  const flowRef = useRef(null)
  const processedHashRef = useRef(null)

  const { writeContractAsync, isPending: isWalletPending, reset: resetWrite } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: robinhoodChain.id,
    confirmations: 1,
    pollingInterval: 2_000,
    query: { enabled: Boolean(txHash) },
  })

  const resetTx = useCallback(() => {
    setTxStep('idle')
    setTxHash(undefined)
    setTxError('')
    depositAssetsRef.current = null
    flowRef.current = null
    processedHashRef.current = null
    resetWrite()
  }, [resetWrite])

  const submit = useCallback(
    (params) => writeContractAsync({ ...params, chainId: robinhoodChain.id }),
    [writeContractAsync],
  )

  useEffect(() => {
    if (!isError || !receiptError) return
    setTxError(txMessage(receiptError))
    setTxStep('idle')
    setTxHash(undefined)
    flowRef.current = null
    depositAssetsRef.current = null
    processedHashRef.current = null
  }, [isError, receiptError])

  useEffect(() => {
    if (!isSuccess || !txHash || processedHashRef.current === txHash) return
    processedHashRef.current = txHash

    const flow = flowRef.current

    async function onConfirmed() {
      if (flow === 'approve') {
        await refetchAllowance()
        flowRef.current = 'deposit'
        setTxStep('depositing')
        try {
          const hash = await submit({
            address: vaultAddress,
            abi: erc4626Abi,
            functionName: 'deposit',
            args: [depositAssetsRef.current, address],
          })
          processedHashRef.current = null
          setTxHash(hash)
        } catch (err) {
          resetTx()
          setTxError(txMessage(err))
        }
        return
      }

      if (flow === 'deposit') {
        depositAssetsRef.current = null
        flowRef.current = null
        await refreshBalances()
        setTxStep('success')
        setTxHash(undefined)
        processedHashRef.current = null
        setTimeout(() => setTxStep('idle'), 2500)
        return
      }

      if (flow === 'withdraw') {
        flowRef.current = null
        await refreshBalances()
        setTxStep('success')
        setTxHash(undefined)
        processedHashRef.current = null
        setTimeout(() => setTxStep('idle'), 2500)
      }
    }

    onConfirmed()
  }, [isSuccess, txHash, address, vaultAddress, refetchAllowance, refreshBalances, resetTx, submit])

  const startDeposit = useCallback(
    async ({ amountStr, usdgBalance }) => {
      if (!address || !amountStr || !usdgBalance) return
      setTxError('')
      processedHashRef.current = null

      let assets
      try {
        assets = parseUnits(amountStr, 6)
      } catch {
        setTxError('Invalid amount')
        return
      }

      if (assets > usdgBalance.value) {
        setTxError('Insufficient USDG balance')
        return
      }
      if (assets === 0n) return

      depositAssetsRef.current = assets

      try {
        const [maxDeposit, yieldBuffer] = await Promise.all([
          readContract(wagmiConfig, {
            address: vaultAddress,
            abi: erc4626Abi,
            functionName: 'maxDeposit',
            args: [address],
          }),
          readContract(wagmiConfig, {
            address: vaultAddress,
            abi: erc4626Abi,
            functionName: 'yieldBuffer',
          }),
        ])

        if (yieldBuffer === 0n) {
          setTxError(VAULT_YIELD_BUFFER_ERROR)
          return
        }

        if (maxDeposit === 0n || assets > maxDeposit) {
          setTxError(
            maxDeposit === 0n
              ? VAULT_YIELD_BUFFER_ERROR
              : `Amount exceeds vault max deposit.`,
          )
          return
        }

        await simulateContract(wagmiConfig, {
          address: vaultAddress,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [assets, address],
          account: address,
          chainId: robinhoodChain.id,
        })

        const freshAllowance = await readContract(wagmiConfig, {
          address: usdgAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, vaultAddress],
        })

        if (freshAllowance < assets) {
          flowRef.current = 'approve'
          setTxStep('approving')
          const hash = await submit({
            address: usdgAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [vaultAddress, maxUint256],
          })
          setTxHash(hash)
          return
        }

        flowRef.current = 'deposit'
        setTxStep('depositing')
        const hash = await submit({
          address: vaultAddress,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [assets, address],
        })
        setTxHash(hash)
      } catch (err) {
        resetTx()
        setTxError(txMessage(err))
      }
    },
    [address, usdgAddress, vaultAddress, wagmiConfig, submit, resetTx],
  )

  const startWithdraw = useCallback(
    async ({ amountStr, max }) => {
      if (!address || !max || max === 0n) return
      setTxError('')
      processedHashRef.current = null

      const assets = amountStr ? parseUnits(amountStr, 6) : max
      if (assets === 0n) return
      if (assets > max) {
        setTxError('Amount exceeds available balance')
        return
      }

      flowRef.current = 'withdraw'
      setTxStep('withdrawing')

      try {
        const hash = await submit({
          address: vaultAddress,
          abi: erc4626Abi,
          functionName: 'withdraw',
          args: [assets, address, address],
        })
        setTxHash(hash)
      } catch (err) {
        resetTx()
        setTxError(txMessage(err))
      }
    },
    [address, vaultAddress, submit, resetTx],
  )

  const isBusy = isWalletPending || isConfirming || ['approving', 'depositing', 'withdrawing'].includes(txStep)

  return {
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
  }
}
