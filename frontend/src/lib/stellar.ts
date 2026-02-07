// Stellar SDK configuration
// TODO: White Belt — Configure for testnet

export const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
export const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
