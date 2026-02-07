# PayCycle Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend    │────▶│  Soroban RPC │────▶│  Stellar Network│
│  (Next.js)  │     │              │     │  (Testnet)      │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐                         ┌─────────────────┐
│  Backend    │                         │  Smart Contracts │
│  (Express)  │                         │  - Subscription  │
│  + Postgres │                         │  - PLC Token    │
└─────────────┘                         │  - Keeper        │
                                        └─────────────────┘
```

## Smart Contract Architecture

TODO: Document at Orange Belt

## Data Flow

TODO: Document at Orange Belt

## Security Considerations

TODO: Document at Green Belt
