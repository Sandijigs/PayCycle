// Contract addresses — update after deployment
// TODO: Yellow Belt — Add subscription contract address
// TODO: Green Belt — Add token + keeper contract addresses

export const CONTRACTS = {
  subscription: (process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID || "").trim(),
  token: (process.env.NEXT_PUBLIC_PLC_TOKEN_CONTRACT_ID || "").trim(),
  keeper: (process.env.NEXT_PUBLIC_KEEPER_CONTRACT_ID || "").trim(),
  usdc: (process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "").trim(),
};

/** Well-known token addresses on Stellar Testnet */
export const TOKENS = {
  XLM: {
    address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
  },
  USDC: {
    address: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;
