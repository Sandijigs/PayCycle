import { useCallback, useState } from "react";
import { useWallet } from "./useWallet";
import * as StellarSdk from "@stellar/stellar-sdk";
import type { TxStatus } from "@/types/subscription";

const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = "https://soroban-testnet.stellar.org";

/**
 * Manages SEP-41 token approval transactions.
 *
 * Builds, signs, and submits a `token.approve(from, spender, amount, expiry)`
 * call so the subscription contract can later `transfer_from` the subscriber.
 *
 * @returns `{ approveToken, isApproving, approvalStatus, approvalHash, error, resetApproval }`
 */
export function useTokenApproval() {
  const { address, kit } = useWallet();

  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<TxStatus>("idle");
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Approve a token contract to spend tokens on behalf of the user.
   * Uses the SAC (Stellar Asset Contract) token.approve() method.
   */
  const approveToken = useCallback(
    async (
      tokenAddress: string,
      spenderAddress: string,
      amount: bigint,
      expiryLedger: number
    ): Promise<void> => {
      if (!address || !kit) {
        throw new Error("Wallet not connected");
      }

      setIsApproving(true);
      setApprovalStatus("signing");
      setError(null);
      setApprovalHash(null);

      try {
        const server = new StellarSdk.rpc.Server(RPC_URL);

        // Load account (use placeholder for simulation)
        const sourceAccount = await server.getAccount(address);

        // Create token contract client
        const tokenContract = new StellarSdk.Contract(tokenAddress);

        // Build approve transaction
        const fromAddr = new StellarSdk.Address(address);
        const spenderAddr = new StellarSdk.Address(spenderAddress);

        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            tokenContract.call(
              "approve",
              fromAddr.toScVal(),
              spenderAddr.toScVal(),
              StellarSdk.nativeToScVal(amount, { type: "i128" }),
              StellarSdk.nativeToScVal(expiryLedger, { type: "u32" })
            )
          )
          .setTimeout(180)
          .build();

        // Simulate transaction
        const simulation = await server.simulateTransaction(tx);

        if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
          throw new Error(`Simulation failed: ${simulation.error}`);
        }

        // Assemble transaction with simulation results
        const assembled = StellarSdk.rpc.assembleTransaction(tx, simulation).build();

        // Sign via wallet
        const xdr = assembled.toXDR();
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        setApprovalStatus("submitting");

        // Submit transaction
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
          signedTxXdr,
          NETWORK_PASSPHRASE
        );
        const sendResult = await server.sendTransaction(signedTx);

        if (sendResult.status === "ERROR") {
          throw new Error(`Transaction failed: ${sendResult.errorResult?.toXDR("base64")}`);
        }

        const hash = sendResult.hash;
        setApprovalHash(hash);

        // Poll for finality
        let getResult = await server.getTransaction(hash);
        while (getResult.status === "NOT_FOUND") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          getResult = await server.getTransaction(hash);
        }

        if (getResult.status === "SUCCESS") {
          setApprovalStatus("success");
        } else {
          throw new Error(`Transaction failed with status: ${getResult.status}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Approval failed";
        setError(message);
        setApprovalStatus("error");
        throw err;
      } finally {
        setIsApproving(false);
      }
    },
    [address, kit]
  );

  const resetApproval = useCallback(() => {
    setApprovalStatus("idle");
    setApprovalHash(null);
    setError(null);
  }, []);

  return {
    approveToken,
    isApproving,
    approvalStatus,
    approvalHash,
    error,
    resetApproval,
  };
}
