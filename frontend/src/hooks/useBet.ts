/**
 * useBet.ts — Full bet placement flow:
 *   1. Preview cost (LMSR)
 *   2. Check/request USDC allowance
 *   3. Submit bet transaction
 *   4. Watch for confirmation
 */

import { useState, useCallback } from "react";
import {
  useReadContract,
  useWriteContract,
  useAccount,
} from "wagmi";
import { maxUint256 } from "viem";
import { CONTRACT_ADDRESS, USDC_ADDRESS } from "@/lib/wagmiConfig";
import { PREDICTION_MARKET_ABI, USDC_ABI } from "@/lib/contractAbi";
import { totalCostWithFee } from "@/lib/lmsr";
import { useToast } from "@/components/ToastProvider";

export type BetOutcome = 1 | 2 | 3; // Home | Away | Draw

interface BetState {
  isPreviewing: boolean;
  isApproving: boolean;
  isBetting: boolean;
  isConfirming: boolean;
  error: string | null;
  txHash: `0x${string}` | null;
}

const INITIAL_STATE: BetState = {
  isPreviewing: false,
  isApproving: false,
  isBetting: false,
  isConfirming: false,
  error: null,
  txHash: null,
};

export function useBet() {
  const { address } = useAccount();
  const { addToast } = useToast();
  const [state, setState] = useState<BetState>(INITIAL_STATE);

  const { writeContractAsync } = useWriteContract();

  // ── Preview cost ───────────────────────────────────────────────────────────
  const previewBet = useCallback(
    async (
      _marketId: bigint,
      _outcome: BetOutcome,
      usdcAmount: bigint
    ): Promise<{ cost: bigint; fee: bigint; total: bigint; shares: bigint } | null> => {
      try {
        setState((s) => ({ ...s, isPreviewing: true, error: null }));
        // shares ≈ amount (1:1 for simplicity; exact calc via contract preview)
        const shares = usdcAmount;
        const { net, fee, total } = totalCostWithFee(shares);
        return { cost: net, fee, total, shares };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Preview failed";
        setState((s) => ({ ...s, error: msg }));
        return null;
      } finally {
        setState((s) => ({ ...s, isPreviewing: false }));
      }
    },
    []
  );

  // ── Place bet ──────────────────────────────────────────────────────────────
  const placeBet = useCallback(
    async (params: {
      marketId: bigint;
      outcome: BetOutcome;
      shares: bigint;       // number of shares (6-decimal)
      maxCost: bigint;      // slippage ceiling
      currentAllowance: bigint;
    }) => {
      if (!address) {
        addToast({ type: "error", message: "Please connect your wallet first." });
        return false;
      }

      setState(INITIAL_STATE);

      try {
        // Step 1: Approve USDC if needed
        if (params.currentAllowance < params.maxCost) {
          setState((s) => ({ ...s, isApproving: true }));
          addToast({ type: "info", message: "Approving USDC spend…" });

          const approveTx = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESS, maxUint256],
          });

          setState((s) => ({ ...s, txHash: approveTx }));
          addToast({
            type: "success",
            message: "USDC approved! Placing your bet…",
          });
        }

        // Step 2: Place bet
        setState((s) => ({ ...s, isApproving: false, isBetting: true }));
        addToast({ type: "info", message: "Submitting bet transaction…" });

        const betTx = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "bet",
          args: [params.marketId, params.outcome, params.shares, params.maxCost],
        });

        setState((s) => ({ ...s, isBetting: false, isConfirming: true, txHash: betTx }));
        addToast({
          type: "success",
          message: "Bet placed! Waiting for confirmation…",
          txHash: betTx,
        });

        return betTx;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        const friendly = msg.includes("rejected") || msg.includes("denied")
          ? "Transaction cancelled by user."
          : msg.includes("slippage")
          ? "Slippage too high. Try reducing your bet size."
          : msg.includes("insufficient")
          ? "Insufficient USDC balance."
          : "Transaction failed. Please try again.";

        setState((s) => ({ ...s, error: friendly, isApproving: false, isBetting: false }));
        addToast({ type: "error", message: friendly });
        return false;
      } finally {
        setState((s) => ({ ...s, isConfirming: false }));
      }
    },
    [address, writeContractAsync, addToast]
  );

  // ── Sell shares ────────────────────────────────────────────────────────────
  const sellShares = useCallback(
    async (params: {
      marketId: bigint;
      outcome: BetOutcome;
      shares: bigint;
      minProceeds: bigint;
    }) => {
      if (!address) return false;
      setState(INITIAL_STATE);

      try {
        setState((s) => ({ ...s, isBetting: true }));
        addToast({ type: "info", message: "Selling shares…" });

        const tx = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "sellShares",
          args: [params.marketId, params.outcome, params.shares, params.minProceeds],
        });

        setState((s) => ({ ...s, isBetting: false, isConfirming: true, txHash: tx }));
        addToast({ type: "success", message: "Shares sold!", txHash: tx });
        return tx;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sell failed";
        setState((s) => ({ ...s, error: msg, isBetting: false }));
        addToast({ type: "error", message: msg });
        return false;
      }
    },
    [address, writeContractAsync, addToast]
  );

  // ── Claim winnings ─────────────────────────────────────────────────────────
  const claimWinnings = useCallback(
    async (marketId: bigint) => {
      if (!address) return false;
      setState(INITIAL_STATE);

      try {
        setState((s) => ({ ...s, isBetting: true }));
        addToast({ type: "info", message: "Claiming winnings…" });

        const tx = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "claimWinnings",
          args: [marketId],
        });

        setState((s) => ({ ...s, isBetting: false, txHash: tx }));
        addToast({ type: "success", message: "🎉 Winnings claimed!", txHash: tx });
        return tx;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Claim failed";
        setState((s) => ({ ...s, error: msg, isBetting: false }));
        addToast({ type: "error", message: msg });
        return false;
      }
    },
    [address, writeContractAsync, addToast]
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const isLoading = state.isApproving || state.isBetting || state.isConfirming;

  return {
    ...state,
    isLoading,
    previewBet,
    placeBet,
    sellShares,
    claimWinnings,
    reset,
  };
}

// ─── USDC balance / allowance hook ────────────────────────────────────────────

export function useUsdcBalance(address: `0x${string}` | undefined) {
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  return {
    balance: (balance as bigint | undefined) ?? 0n,
    allowance: (allowance as bigint | undefined) ?? 0n,
  };
}

// ─── Position hook ────────────────────────────────────────────────────────────

export function usePosition(marketId: bigint | undefined, user: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPosition",
    args: marketId && user ? [marketId, user] : undefined,
    query: { enabled: !!marketId && !!user, refetchInterval: 8_000 },
  });

  const pos = data as
    | { sharesHome: bigint; sharesAway: bigint; sharesDraw: bigint; claimed: boolean }
    | undefined;

  return {
    sharesHome: pos?.sharesHome ?? 0n,
    sharesAway: pos?.sharesAway ?? 0n,
    sharesDraw: pos?.sharesDraw ?? 0n,
    claimed:    pos?.claimed ?? false,
    hasPosition: !!pos && (pos.sharesHome > 0n || pos.sharesAway > 0n || pos.sharesDraw > 0n),
  };
}
