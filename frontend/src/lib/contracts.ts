// Contract addresses — update after deployment
// TODO: Yellow Belt — Add subscription contract address
// TODO: Green Belt — Add token + keeper contract addresses

export const CONTRACTS = {
  subscription: process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ID || "",
  token: process.env.NEXT_PUBLIC_PLC_TOKEN_CONTRACT_ID || "",
  keeper: process.env.NEXT_PUBLIC_KEEPER_CONTRACT_ID || "",
  usdc: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "",
};
