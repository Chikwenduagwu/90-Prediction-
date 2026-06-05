import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { USDC_ADDRESS } from "@/lib/wagmiConfig";
import { formatUsdc } from "@/lib/lmsr";

const FAUCET_AMOUNT = "500 USDC";

const USDC_ABI = [
  {
    name: "faucet",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" as const }],
    outputs: [{ name: "", type: "uint256" as const }],
  },
] as const;

export function Faucet() {
  const navigate = useNavigate();
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected } = useAccount();
  const [claimed, setClaimed] = useState(false);

  // Get the active wallet address from either wagmi or Privy wallets
  const activeAddress = address || (wallets?.[0]?.address as `0x${string}` | undefined);
  const isWalletReady = isConnected || (authenticated && !!activeAddress);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: activeAddress ? [activeAddress] : undefined,
    query: { enabled: !!activeAddress },
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess && !claimed) {
    setClaimed(true);
    void refetchBalance();
  }

  function handleClaim() {
    if (!isWalletReady) {
      login();
      return;
    }
    writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: "faucet",
      args: [],
    });
  }

  const formattedBalance = balance ? formatUsdc(balance as bigint, 2) : "0.00";
  const isLoading = isPending || isConfirming;

  return (
    <main style={{ maxWidth: "520px", margin: "0 auto", padding: "2rem 1rem" }}>
      <button onClick={() => navigate("/")} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-tertiary)", fontSize: "0.875rem",
        marginBottom: "1.5rem", padding: 0, display: "flex", alignItems: "center", gap: "4px",
      }}>
        ← All markets
      </button>

      <div style={{
        background: "var(--bg-glass)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--r-2xl)",
        padding: "2rem",
        boxShadow: "var(--shadow-float)",
        marginBottom: "1rem",
        textAlign: "center",
      }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "20px",
          background: "linear-gradient(135deg, var(--orange-light), rgba(255,107,0,0.05))",
          border: "1px solid var(--border-orange)",
          margin: "0 auto 1.25rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem",
        }}>
          🚰
        </div>

        <h1 style={{
          fontSize: "1.5rem", fontWeight: 900, color: "var(--text-primary)",
          letterSpacing: "-0.03em", marginBottom: "0.5rem",
        }}>
          Mock USDC Faucet
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "340px", margin: "0 auto 1.75rem" }}>
          Claim free test USDC to try out prediction markets on XLayer Testnet.
        </p>

        {isWalletReady && activeAddress && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", borderRadius: "20px",
            background: "var(--bg-subtle)", border: "0.5px solid var(--border)",
            marginBottom: "1.5rem",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--green)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>Balance:</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {formattedBalance} USDC
            </span>
          </div>
        )}

        <div style={{
          padding: "1.25rem", borderRadius: "var(--r-xl)",
          background: "var(--orange-light)", border: "1px solid var(--border-orange)",
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "0.7rem", color: "var(--orange)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            You will receive
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--orange)" }}>
            {FAUCET_AMOUNT}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Mock USDC · XLayer Testnet
          </div>
        </div>

        {writeError && (
          <div style={{
            padding: "0.75rem", borderRadius: "var(--r-md)", marginBottom: "1rem",
            background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)",
            color: "#ef4444", fontSize: "0.8rem",
          }}>
            {writeError.message?.slice(0, 100)}
          </div>
        )}

        {claimed ? (
          <div style={{
            padding: "0.875rem", borderRadius: "var(--r-md)",
            background: "rgba(22,163,74,0.1)", border: "0.5px solid rgba(22,163,74,0.3)",
            color: "var(--green)", fontSize: "0.9rem", fontWeight: 700,
          }}>
            ✅ {FAUCET_AMOUNT} sent to your wallet!
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isLoading}
            style={{
              width: "100%", padding: "0.9rem",
              borderRadius: "var(--r-md)", border: "none",
              background: isLoading ? "var(--bg-subtle)" : "var(--orange)",
              color: isLoading ? "var(--text-tertiary)" : "#fff",
              fontSize: "1rem", fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: isLoading ? "none" : "0 4px 20px rgba(255,107,0,0.3)",
              transition: "all 0.15s",
            }}
          >
            {!isWalletReady
              ? "Connect Wallet to Claim"
              : isPending ? "Confirm in wallet…"
              : isConfirming ? "Processing…"
              : `🚰 Claim ${FAUCET_AMOUNT}`}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[
          { icon: "🔗", title: "Testnet Only", desc: "This faucet works on XLayer Testnet. No real funds involved." },
          { icon: "⚡", title: "Instant Claim", desc: "USDC is minted directly to your wallet via a smart contract call." },
          { icon: "🎯", title: "Start Predicting", desc: "Use your test USDC to place bets on football prediction markets." },
        ].map((item) => (
          <div key={item.title} style={{
            display: "flex", gap: "0.875rem", alignItems: "flex-start",
            padding: "1rem", borderRadius: "var(--r-lg)",
            background: "var(--bg-glass)", backdropFilter: "blur(12px)",
            border: "0.5px solid var(--border)",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
              background: "var(--bg-subtle)", border: "0.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {claimed && (
        <button onClick={() => navigate("/")} style={{
          width: "100%", marginTop: "1.25rem", padding: "0.875rem",
          borderRadius: "var(--r-md)", border: "1px solid var(--border-orange)",
          background: "var(--orange-light)", color: "var(--orange)",
          fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
        }}>
          ⚽ Start Predicting →
        </button>
      )}
    </main>
  );
}
