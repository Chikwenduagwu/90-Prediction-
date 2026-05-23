/**
 * BetModal.tsx — Full bet placement modal
 * USDC amount input + YES/NO/DRAW toggle + cost preview + submit
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useBet, useUsdcBalance, type BetOutcome } from "@/hooks/useBet";
import { formatUsdc, parseUsdc, lmsrCost, totalCostWithFee, probToOdds } from "@/lib/lmsr";
import type { Market } from "@/hooks/useMarkets";
import { matchToShareText } from "@/lib/footballData";

interface BetModalProps {
  market: Market;
  onClose: () => void;
  onSuccess?: () => void;
}

type OutcomeLabel = "Home" | "Draw" | "Away";

const OUTCOME_MAP: Record<OutcomeLabel, BetOutcome> = {
  Home: 1,
  Draw: 3,
  Away: 2,
};

export function BetModal({ market, onClose, onSuccess }: BetModalProps) {
  const { address } = useAccount();
  const { login, authenticated } = usePrivy();
  const { balance, allowance } = useUsdcBalance(address);
  const { placeBet, isLoading, error, txHash } = useBet();

  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeLabel>("Home");
  const [amountStr, setAmountStr] = useState("10");
  const [preview, setPreview] = useState<{ cost: bigint; fee: bigint; total: bigint; shares: bigint } | null>(null);

  // Derive preview from LMSR
  useEffect(() => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setPreview(null);
      return;
    }
    const shares = parseUsdc(amountStr);

    // Map outcome label to share array index: Home=0, Away=1, Draw=2
    const outcomeToIdx: Record<OutcomeLabel, number> = { Home: 0, Away: 1, Draw: 2 };
    const cost = lmsrCost(market.shares, outcomeToIdx[selectedOutcome], shares);
    const { net, fee, total } = totalCostWithFee(cost);
    setPreview({ cost: net, fee, total, shares });
  }, [amountStr, selectedOutcome, market.shares]);

  const handleBet = useCallback(async () => {
    if (!authenticated) { void login(); return; }
    if (!preview) return;

    const outcome = OUTCOME_MAP[selectedOutcome];
    const slippage = (preview.total * 105n) / 100n; // 5% slippage tolerance

    const tx = await placeBet({
      marketId: market.id,
      outcome,
      shares: preview.shares,
      maxCost: slippage,
      currentAllowance: allowance,
    });

    if (tx) {
      onSuccess?.();
      // Let toast show success — don't close immediately
      setTimeout(onClose, 2000);
    }
  }, [authenticated, login, preview, selectedOutcome, placeBet, market.id, allowance, onSuccess, onClose]);

  const handleShare = () => {
    const outcomeLabel = selectedOutcome;
    const idxMap: Record<OutcomeLabel, number> = { Home: 0, Away: 1, Draw: 2 };
    const probMap: Record<OutcomeLabel, number> = {
      Home: market.probHome,
      Away: market.probAway,
      Draw: market.probDraw,
    };
    const odds = probToOdds(probMap[selectedOutcome]);

    const fdMatch = {
      id: Number(market.id),
      homeTeam: { shortName: market.homeTeam, name: market.homeTeam, id: 0, tla: "", crest: "" },
      awayTeam: { shortName: market.awayTeam, name: market.awayTeam, id: 0, tla: "", crest: "" },
      competition: { code: market.league, id: 0, name: market.league, type: "", emblem: "" },
    };

    const text = matchToShareText(fdMatch as Parameters<typeof matchToShareText>[0], outcomeLabel, odds);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  };

  const oddsMap: Record<OutcomeLabel, number> = {
    Home: market.oddsHome,
    Draw: market.oddsDraw,
    Away: market.oddsAway,
  };

  const probMap: Record<OutcomeLabel, number> = {
    Home: market.probHome,
    Draw: market.probDraw,
    Away: market.probAway,
  };

  const insufficientBalance = preview ? balance < preview.total : false;
  const canBet = authenticated && preview && !isLoading && !insufficientBalance && market.isOpen;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 200,
          backdropFilter: "blur(2px)",
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bet-modal-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "16px",
          padding: "1.5rem",
          width: "min(480px, calc(100vw - 2rem))",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2
              id="bet-modal-title"
              style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)" }}
            >
              Place Bet
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              {market.homeTeam} vs {market.awayTeam}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "8px",
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: "1rem",
            }}
          >
            ×
          </button>
        </div>

        {/* Outcome toggle */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>
            Select outcome
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {(["Home", "Draw", "Away"] as OutcomeLabel[]).map((o) => {
              const active = selectedOutcome === o;
              return (
                <button
                  key={o}
                  onClick={() => setSelectedOutcome(o)}
                  style={{
                    padding: "0.75rem 0.5rem",
                    borderRadius: "10px",
                    border: active ? "2px solid #1e9e75" : "0.5px solid var(--color-border-secondary)",
                    background: active ? "rgba(30,158,117,0.08)" : "var(--color-background-secondary)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>
                    {o === "Home" ? market.homeTeam : o === "Away" ? market.awayTeam : "Draw"}
                  </div>
                  <div style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: active ? "#1e9e75" : "var(--color-text-primary)",
                  }}>
                    {oddsMap[o].toFixed(2)}x
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
                    {Math.round(probMap[o] * 100)}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="bet-amount"
            style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}
          >
            Amount (USDC)
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}>
              $
            </span>
            <input
              id="bet-amount"
              type="number"
              min="1"
              step="1"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 0.75rem 0.75rem 2rem",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-secondary)",
                fontSize: "1rem",
                fontWeight: 500,
                color: "var(--color-text-primary)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Quick amounts */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {["10", "25", "50", "100"].map((v) => (
              <button
                key={v}
                onClick={() => setAmountStr(v)}
                style={{
                  flex: 1,
                  padding: "4px",
                  borderRadius: "6px",
                  border: "0.5px solid var(--color-border-tertiary)",
                  background: amountStr === v ? "var(--color-background-secondary)" : "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Cost breakdown */}
        {preview && (
          <div style={{
            background: "var(--color-background-secondary)",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Bet amount", value: formatUsdc(preview.cost) },
                { label: "Platform fee (2%)", value: formatUsdc(preview.fee) },
                { label: "Potential return", value: `~${formatUsdc(preview.shares * BigInt(Math.round(oddsMap[selectedOutcome] * 100)) / 100n)}` },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
                  <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{row.value} USDC</span>
                </div>
              ))}
              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "6px", marginTop: "2px", display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Total</span>
                <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{formatUsdc(preview.total)} USDC</span>
              </div>
            </div>

            {insufficientBalance && (
              <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--color-text-danger)" }}>
                ⚠ Insufficient balance. You have {formatUsdc(balance)} USDC.
              </p>
            )}
          </div>
        )}

        {/* x402 note */}
        <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: "var(--color-text-tertiary)", textAlign: "center" }}>
          ⚡ Powered by x402 — bet with USDC, no OKB needed for gas
        </p>

        {/* Error */}
        {error && (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--color-text-danger)", padding: "8px 12px", background: "var(--color-background-danger)", borderRadius: "8px" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          {!authenticated ? (
            <button
              onClick={() => void login()}
              style={{
                flex: 1,
                padding: "0.875rem",
                borderRadius: "10px",
                border: "none",
                background: "#1e9e75",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Connect to bet
            </button>
          ) : (
            <button
              onClick={() => void handleBet()}
              disabled={!canBet}
              style={{
                flex: 1,
                padding: "0.875rem",
                borderRadius: "10px",
                border: "none",
                background: canBet ? "#1e9e75" : "var(--color-background-secondary)",
                color: canBet ? "#fff" : "var(--color-text-tertiary)",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: canBet ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              {isLoading ? "Processing…" : `Bet ${selectedOutcome} ${oddsMap[selectedOutcome].toFixed(2)}x`}
            </button>
          )}

          {txHash && (
            <button
              onClick={handleShare}
              title="Share on X"
              style={{
                padding: "0.875rem",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border-secondary)",
                background: "none",
                cursor: "pointer",
                fontSize: "1rem",
              }}
              aria-label="Share bet on X/Twitter"
            >
              𝕏
            </button>
          )}
        </div>
      </div>
    </>
  );
}
