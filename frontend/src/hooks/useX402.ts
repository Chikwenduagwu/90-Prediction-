/**
 * useX402.ts — React hook for x402 payment protocol
 *
 * Wraps x402Fetch with wallet client integration, loading state,
 * and user confirmation dialog support.
 */

import { useState, useCallback } from "react";
import { useWalletClient, useAccount } from "wagmi";
import {
  x402Fetch,
  X402PaymentDetails,
  estimateX402Fee,
} from "@/lib/x402";
import { useToast } from "@/components/ToastProvider";
import { formatUsdc } from "@/lib/lmsr";

interface X402State {
  isLoading: boolean;
  pendingPayment: X402PaymentDetails | null;
  error: string | null;
}

export function useX402() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { addToast } = useToast();
  const [state, setState] = useState<X402State>({
    isLoading: false,
    pendingPayment: null,
    error: null,
  });

  /**
   * Execute an x402-protected fetch with automatic payment signing.
   * Shows a toast for confirmation when payment is required.
   */
  const fetchWithPayment = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response | null> => {
      if (!walletClient || !address) {
        addToast({ type: "error", message: "Connect your wallet to use x402 payments." });
        return null;
      }

      setState({ isLoading: true, pendingPayment: null, error: null });

      try {
        const response = await x402Fetch(
          url,
          options,
          walletClient,
          address,
          async (details: X402PaymentDetails) => {
            setState((s) => ({ ...s, pendingPayment: details }));
            const fee = estimateX402Fee(BigInt(details.maxAmountRequired));
            addToast({
              type: "info",
              message: `x402: Signing payment of ${formatUsdc(fee)} USDC (no OKB needed)`,
            });
            // Auto-confirm; could be replaced with a dialog
            return true;
          }
        );

        if (!response.ok && response.status !== 402) {
          throw new Error(`Request failed: ${response.status}`);
        }

        addToast({ type: "success", message: "x402 payment accepted ✓" });
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "x402 payment failed";
        setState((s) => ({ ...s, error: msg }));
        addToast({ type: "error", message: msg });
        return null;
      } finally {
        setState((s) => ({ ...s, isLoading: false, pendingPayment: null }));
      }
    },
    [walletClient, address, addToast]
  );

  /**
   * Test x402 flow against the configured facilitator
   */
  const testX402Flow = useCallback(async () => {
    const facilitatorUrl = import.meta.env.VITE_X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
    addToast({ type: "info", message: "Testing x402 payment flow…" });
    const res = await fetchWithPayment(`${facilitatorUrl}/health`, { method: "GET" });
    if (res) {
      addToast({ type: "success", message: "x402 facilitator reachable!" });
    }
  }, [fetchWithPayment, addToast]);

  return {
    ...state,
    fetchWithPayment,
    testX402Flow,
    isReady: !!walletClient && !!address,
  };
}
