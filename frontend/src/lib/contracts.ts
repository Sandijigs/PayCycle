// Contract addresses
export const CONTRACTS = {
  subscription: (process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID || "").trim(),
  token: (process.env.NEXT_PUBLIC_PLC_TOKEN_CONTRACT_ID || "").trim(),
  keeper: (process.env.NEXT_PUBLIC_KEEPER_CONTRACT_ID || "").trim(),
  usdc: (process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "").trim(),
};

/** Well-known token addresses on Stellar Testnet */
export const TOKENS: Record<string, { address: string; symbol: string; name: string; decimals: number }> = {
  XLM: {
    address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
  },
  PLC: {
    address: (process.env.NEXT_PUBLIC_PLC_TOKEN_CONTRACT_ID || "").trim(),
    symbol: "PLC",
    name: "PayCycle Token",
    decimals: 7,
  },
  USDC: {
    address: (process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "").trim(),
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
  },
};

export type TokenSymbol = keyof typeof TOKENS;
