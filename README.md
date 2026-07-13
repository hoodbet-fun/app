# hoodbet.fun app

HoodPot dApp for [app.hoodbet.fun](https://app.hoodbet.fun) — deposit, withdraw, prizes on Robinhood Chain.

## Dev

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
# deploy dist/ to app.hoodbet.fun
```

Public URLs are hardcoded in `src/config.js`. Optional env vars for contract addresses after deploy:

| Variable | Purpose |
|----------|---------|
| `VITE_PRIZE_VAULT` | PrizeVault address |
| `VITE_HOOD_POINTS` | HoodPointsRegistry address |
| `VITE_HOOD_TOKEN` | $HOOD token address |
| `VITE_RPC_URL` | Custom RPC (default: Robinhood mainnet) |
