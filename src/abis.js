export const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
]

/** Morpho MetaMorpho — accrueInterest mints fee shares before balanceOf reflects pending fees. */
export const morphoVaultAbi = [
  {
    name: 'accrueInterest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
]

export const erc4626Abi = [
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'yieldBuffer',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
]

export const prizePoolAbi = [
  { name: 'accountedBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getOpenDrawId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint24' }] },
  { name: 'getLastAwardedDrawId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint24' }] },
  { name: 'firstDrawOpensAt', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint48' }] },
  { name: 'getDrawIdToAward', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint24' }] },
  { name: 'drawClosesAt', type: 'function', stateMutability: 'view', inputs: [{ name: 'drawId', type: 'uint24' }], outputs: [{ type: 'uint48' }] },
  { name: 'drawOpensAt', type: 'function', stateMutability: 'view', inputs: [{ name: 'drawId', type: 'uint24' }], outputs: [{ type: 'uint48' }] },
  { name: 'numberOfTiers', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  {
    name: 'getVaultUserBalanceAndTotalSupplyTwab',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_user', type: 'address' },
      { name: '_startDrawIdInclusive', type: 'uint24' },
      { name: '_endDrawIdInclusive', type: 'uint24' },
    ],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }],
  },
  {
    name: 'isWinner',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_user', type: 'address' },
      { name: '_tier', type: 'uint8' },
      { name: '_prizeIndex', type: 'uint32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'wasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_winner', type: 'address' },
      { name: '_tier', type: 'uint8' },
      { name: '_prizeIndex', type: 'uint32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getTierPrizeSize',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_tier', type: 'uint8' }],
    outputs: [{ type: 'uint104' }],
  },
]

export const claimerAbi = [
  {
    name: 'claimPrizes',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_tier', type: 'uint8' },
      { name: '_winners', type: 'address[]' },
      { name: '_prizeIndices', type: 'uint32[][]' },
      { name: '_feeRecipient', type: 'address' },
      { name: '_minFeePerClaim', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
]

export const pointsAbi = [
  { name: 'getTierName', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'string' }] },
  { name: 'getReferralMultiplierBps', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint16' }] },
]
