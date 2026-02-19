"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  ISupportedWallet,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule,
  LobstrModule,
} from "@creit.tech/stellar-wallets-kit";

interface WalletContextType {
  kit: StellarWalletsKit | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  network: WalletNetwork;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within WalletProvider");
  }
  return context;
}

export default function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const network = WalletNetwork.TESTNET;

  useEffect(() => {
    // Initialize StellarWalletsKit
    const walletKit = new StellarWalletsKit({
      network: network,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule(), new xBullModule(), new LobstrModule()],
    });

    setKit(walletKit);

    // Check if wallet was previously connected
    const checkConnection = async () => {
      try {
        const { address: pubKey } = await walletKit.getAddress();
        if (pubKey) {
          setAddress(pubKey);
          setIsConnected(true);
        }
      } catch (error) {
        // Wallet not connected, ignore
        console.log("Wallet not connected on load");
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    if (!kit) {
      console.error("WalletKit not initialized");
      return;
    }

    setIsConnecting(true);
    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          kit.setWallet(option.id);
          const { address: pubKey } = await kit.getAddress();
          setAddress(pubKey);
          setIsConnected(true);
        },
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setAddress(null);
    setIsConnected(false);
  };

  const value: WalletContextType = {
    kit,
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    network,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
