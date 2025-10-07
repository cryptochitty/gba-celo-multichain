# GBA On-Chain Event Tracker (multi-chain)

This repository is a packaged starter to run a multi-chain event tracker + API + frontend that integrates with Global Builders Academy.

## Features
- Tracker: long-running Node worker that polls multiple chains (Celo, Polygon, Base, Superchain) for logs and saves events to Postgres.
- API: Express server exposing `/events`, `/stats`, `/link-wallet`.
- Frontend: Next.js page with multi-wallet (RainbowKit/wagmi) connector and events dashboard.
- Docker Compose for local testing.

## Quick local run (dev)
1. Copy `infra/chains.json` and edit RPC endpoints & add tracked contract addresses.
2. From `infra/` run:
   ```
   docker-compose up --build
   ```
3. Run migrations (psql into DB) using `migrations/001_create_tables.sql`.
4. Visit frontend with `cd frontend && npm install && npm run dev` (or dockerize frontend).

## Notes
- Replace RPC endpoints with reliable providers (Alchemy, Infura, QuickNode).
- Do not commit secrets. Use env vars in production.
