import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useBet, useUsdcBalance, type BetOutcome } from "@/hooks/useBet";
import { formatUsdc, parseUsdc, lmsrCost, totalCostWithFee, probToOdds } from "@/lib/lmsr";
import type { Market } from "@/hooks/useMarkets";
import { matchToShareText } from "@/lib/footballData";

interface BetModalProps { market: Market; onClose: () => void; onSuccess?: () => void; }
type OutcomeLabel = "Home" | "Draw" | "Away";

const OUTCOME_MAP: Record<OutcomeLabel, BetOutcome> = { Home: 1, Draw: 3, Away: 2 };

export function BetModal({ market, onClose, onSuccess }: BetModalProps) {
  const { address } = useAccount();
  const { login, authenticated } = usePrivy();
  const { balance, allowance } = useUsdcBalance(address);
  const { placeBet, isLoading, error, txHash } = useBet();

  const [selected, setSelected] = useState<OutcomeLabel>("Home");
  const [amountStr, setAmountStr] = useState("10");
  const [preview, setPreview] = useState<{ cost: bigint; fee: bigint; total: bigint; shares: bigint } | null>(null);

  useEffect(() => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { setPreview(null); return; }
    const shares = parseUsdc(amountStr);
    const idxMap: Record<OutcomeLabel, number> = { Home: 0, Away: 1, Draw: 2 };
    const cost = lmsrCost(market.shares, idxMap[selected], shares);
    const { net, fee, total } = totalCostWithFee(cost);
    setPreview({ cost: net, fee, total, shares });
  }, [amountStr, selected, market.shares]);

  const handleBet = useCallback(async () => {
    if (!authenticated) { void login(); return; }
    if (!preview) return;
    const outcome = OUTCOME_MAP[selected];
    const tx = await placeBet({
      marketId: market.id, outcome, shares: preview.shares,
      maxCost: (preview.total * 105n) / 100n, currentAllowance: allowance,
    });
    if (tx) { onSuccess?.(); setTimeout(onClose, 2000); }
  }, [authenticated, login, preview, selected, placeBet, market.id, allowance, onSuccess, onClose]);

  const handleShare = () => {
    const probMap: Record<OutcomeLabel, number> = { Home: market.probHome, Away: market.probAway, Draw: market.probDraw };
    const odds = probToOdds(probMap[selected]);
    const fdMatch = {
      id: Number(market.id),
      homeTeam: { shortName: market.homeTeam, name: market.homeTeam, id: 0, tla: "", crest: "" },
      awayTeam: { shortName: market.awayTeam, name: market.awayTeam, id: 0, tla: "", crest: "" },
      competition: { code: market.league, id: 0, name: market.league, type: "", emblem: "" },
    };
    const text = matchToShareText(fdMatch as Parameters<typeof matchToShareText>[0], selected, odds);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const oddsMap: Record<OutcomeLabel, number> = { Home: market.oddsHome, Draw: market.oddsDraw, Away: market.oddsAway };
  const probMap: Record<OutcomeLabel, number> = { Home: market.probHome, Draw: market.probDraw, Away: market.probAway };
  const insufficient = preview ? balance < preview.total : false;
  const canBet = authenticated && preview && !isLoading && !insufficient && market.isOpen;

  const outcomes: OutcomeLabel[] = ["Home", "Draw", "Away"];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.40)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 301,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "0.5px solid var(--border-mid)",
        borderRadius: "var(--r-xl)",
        padding: "1.5rem",
        width: "min(480px, calc(100vw - 1.5rem))",
        maxHeight: "92dvh",
        overflowY: "auto",
        boxShadow: "var(--shadow-modal)",
        animation: "modalFadeIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>Place Bet</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              {market.homeTeam} vs {market.awayTeam}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "var(--bg-subtle-2)", border: "0.5px solid var(--border)",
            borderRadius: "var(--r-md)", width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "1rem", color: "var(--text-secondary)", flexShrink: 0,
          }}>×</button>
        </div>

        {/* Outcome toggle */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
            Select outcome
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {outcomes.map((o) => {
              const active = selected === o;
              return (
                <button key={o} onClick={() => setSelected(o)} style={{
                  flex: 1, padding: "0.75rem 0.5rem",
                  borderRadius: "var(--r-lg)",
                  border: active ? "2px solid var(--orange)" : "1px solid var(--border)",
                  background: active ? "var(--orange-light)" : "var(--bg-subtle)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s",
                  display: "flex", flexDirection: "column", gap: "3px",
                }}>
                  <span style={{ fontSize: "0.68rem", color: active ? "var(--orange)" : "var(--text-tertiary)", fontWeight: 600 }}>
                    {o === "Home" ? market.homeTeam : o === "Away" ? market.awayTeam : "Draw"}
                  </span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: active ? "var(--orange)" : "var(--text-primary)" }}>
                    {oddsMap[o].toFixed(2)}x
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
                    {Math.round(probMap[o] * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="bet-amount" style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
            Amount (USDC)
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontWeight: 600, fontSize: "0.9rem", pointerEvents: "none" }}>$</span>
            <input
              id="bet-amount" type="number" min="1" step="1" value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem 0.75rem 0.75rem 2rem",
                borderRadius: "var(--r-md)", border: "1px solid var(--border-mid)",
                background: "var(--bg-glass-deep)",
                fontSize: "max(16px,1rem)", fontWeight: 600, color: "var(--text-primary)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {["10", "25", "50", "100"].map((v) => (
              <button key={v} onClick={() => setAmountStr(v)} style={{
                flex: 1, padding: "5px 4px",
                borderRadius: "var(--r-sm)",
                border: `1px solid ${amountStr === v ? "var(--orange)" : "var(--border)"}`,
                background: amountStr === v ? "var(--orange-light)" : "var(--bg-subtle)",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                color: amountStr === v ? "var(--orange)" : "var(--text-secondary)",
                transition: "all 0.12s",
              }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Cost breakdown */}
        {preview && (
          <div style={{
            background: "var(--bg-subtle)", borderRadius: "var(--r-lg)",
            padding: "1rem", marginBottom: "1rem",
            border: "0.5px solid var(--border)",
          }}>
            {[
              { label: "Bet amount", value: formatUsdc(preview.cost) },
              { label: "Platform fee (2%)", value: formatUsdc(preview.fee) },
              { label: "Potential return", value: `~${formatUsdc(preview.shares * BigInt(Math.round(oddsMap[selected] * 100)) / 100n)}` },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{row.label}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.value} USDC</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", marginTop: "4px", borderTop: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>Total</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--orange)" }}>{formatUsdc(preview.total)} USDC</span>
            </div>
            {insufficient && (
              <p style={{ fontSize: "0.78rem", color: "var(--red)", marginTop: "8px", fontWeight: 500 }}>
                ⚠ Insufficient balance ({formatUsdc(balance)} USDC available)
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textAlign: "center", marginBottom: "1rem" }}>
          ⚡ x402 powered — bet with USDC, zero OKB gas fees
        </p>

        {error && (
          <div style={{ fontSize: "0.8rem", color: "var(--red)", padding: "0.625rem 0.875rem", background: "var(--red-bg)", borderRadius: "var(--r-md)", marginBottom: "0.75rem", border: "0.5px solid rgba(220,38,38,0.2)" }}>
            {error}
          </div>
        )}

        {/* CTA row */}
        <div style={{ display: "flex", gap: "8px" }}>
          {!authenticated ? (
            <button onClick={() => void login()} style={{
              flex: 1, padding: "0.875rem", borderRadius: "var(--r-md)",
              border: "none", background: "var(--black)", color: "#fff",
              fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
            }}>
              Connect to bet
            </button>
          ) : (
            <button onClick={() => void handleBet()} disabled={!canBet} style={{
              flex: 1, padding: "0.875rem", borderRadius: "var(--r-md)",
              border: "none",
              background: canBet ? "var(--orange)" : "var(--bg-subtle-2)",
              color: canBet ? "#fff" : "var(--text-tertiary)",
              fontSize: "0.95rem", fontWeight: 700,
              cursor: canBet ? "pointer" : "not-allowed",
              boxShadow: canBet ? "0 4px 16px rgba(255,107,0,0.30)" : "none",
              transition: "all 0.15s",
            }}>
              {isLoading ? "Processing…" : `Bet ${selected} @ ${oddsMap[selected].toFixed(2)}x`}
            </button>
          )}
          {txHash && (
            <button onClick={handleShare} title="Share on X" style={{
              padding: "0.875rem", borderRadius: "var(--r-md)",
              border: "1px solid var(--border-mid)",
              background: "var(--bg-glass-deep)", cursor: "pointer",
              fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)",
              flexShrink: 0,
            }}>
              𝕏
            </button>
          )}
        </div>
      </div>
    </>
  );
}
