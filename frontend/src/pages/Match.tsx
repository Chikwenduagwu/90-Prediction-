/**
 * Match.tsx — Single match detail page
 * Full bet flow, live LMSR odds chart, current position, claim button
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useMarket } from "@/hooks/useMarkets";
import { usePosition, useBet } from "@/hooks/useBet";
import { OddsChart } from "@/components/OddsChart";
import { BetModal } from "@/components/BetModal";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatUsdc } from "@/lib/lmsr";
import { getCompetitionMeta } from "@/lib/footballData";
import { EXPLORER_URL, CONTRACT_ADDRESS } from "@/lib/wagmiConfig";

const WINNER_LABELS: Record<number, string> = { 1: "Home", 2: "Away", 3: "Draw" };

export function Match() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const marketId = id ? BigInt(id) : undefined;

  const { market, isLoading, refetch } = useMarket(marketId);
  const position = usePosition(marketId, address);
  const { claimWinnings, isLoading: claiming } = useBet();
  const [showBetModal, setShowBetModal] = useState(false);

  if (isLoading) {
    return (
      <div style={{ maxWidth: "900px", margin: "3rem auto", padding: "0 1.5rem", textAlign: "center", color: "var(--color-text-tertiary)" }}>
        Loading match…
      </div>
    );
  }

  if (!market) {
    return (
      <div style={{ maxWidth: "900px", margin: "3rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>Market not found.</p>
        <button onClick={() => navigate("/")} style={{ marginTop: "1rem", cursor: "pointer", color: "#1e9e75", background: "none", border: "none", fontSize: "0.9rem" }}>
          ← Back to markets
        </button>
      </div>
    );
  }

  const meta = getCompetitionMeta(market.league);
  const kickoff = new Date(Number(market.matchTimestamp) * 1000);

  // Determine claimable
  const canClaim = market.resolved && !position.claimed && (
    (market.winner === 1 && position.sharesHome > 0n) ||
    (market.winner === 2 && position.sharesAway > 0n) ||
    (market.winner === 3 && position.sharesDraw > 0n)
  );

  const handleClaim = async () => {
    if (!marketId) return;
    await claimWinnings(marketId);
    refetch();
  };

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", padding: 0 }}
      >
        ← All markets
      </button>

      {/* Match header */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "16px",
        padding: "1.75rem",
        marginBottom: "1.25rem",
      }}>
        {/* League + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
            {meta.flag} {meta.name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {market.resolved && (
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "6px",
                background: "var(--color-background-success)",
                color: "var(--color-text-success)",
              }}>
                {WINNER_LABELS[market.winner]} wins
              </span>
            )}
            {market.isOpen && <CountdownTimer targetTimestamp={market.closingTime} label="Closes" />}
          </div>
        </div>

        {/* Teams + score */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--color-background-secondary)",
              margin: "0 auto 0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}>
              🏠
            </div>
            <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {market.homeTeam}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>Home</p>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>
              {kickoff.toLocaleDateString("en", { month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.1em" }}>
              vs
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
              {kickoff.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--color-background-secondary)",
              margin: "0 auto 0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}>
              ✈️
            </div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {market.awayTeam}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>Away</p>
          </div>
        </div>

        {/* Odds */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {[
            { label: market.homeTeam, outcome: 1 as const, prob: market.probHome, odds: market.oddsHome, color: "#1e9e75" },
            { label: "Draw",         outcome: 3 as const, prob: market.probDraw, odds: market.oddsDraw, color: "#888780" },
            { label: market.awayTeam, outcome: 2 as const, prob: market.probAway, odds: market.oddsAway, color: "#3266ad" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => market.isOpen && setShowBetModal(true)}
              disabled={!market.isOpen}
              style={{
                padding: "1rem",
                borderRadius: "12px",
                border: "0.5px solid",
                borderColor: market.resolved && market.winner === item.outcome
                  ? "#1e9e75"
                  : "var(--color-border-tertiary)",
                background: market.resolved && market.winner === item.outcome
                  ? "rgba(30,158,117,0.08)"
                  : "var(--color-background-secondary)",
                cursor: market.isOpen ? "pointer" : "default",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: item.color }}>{item.odds.toFixed(2)}x</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
                {Math.round(item.prob * 100)}%
              </div>

              {/* Probability bar */}
              <div style={{ height: "3px", borderRadius: "2px", background: "var(--color-border-tertiary)", marginTop: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round(item.prob * 100)}%`, background: item.color, borderRadius: "2px", transition: "width 0.4s ease" }} />
              </div>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          {[
            { label: "Total volume", value: `${formatUsdc(market.totalVolume, 0)} USDC` },
            { label: "Fees collected", value: `${formatUsdc(market.feesCollected)} USDC` },
            { label: "Match ID", value: `#${market.externalMatchId}` },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginTop: "2px" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: position.hasPosition ? "1fr 300px" : "1fr", gap: "1.25rem", alignItems: "start" }}>
        {/* Odds chart */}
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}>
          <OddsChart market={market} />

          {/* Bet CTA */}
          {market.isOpen && (
            <button
              onClick={() => setShowBetModal(true)}
              style={{
                width: "100%",
                marginTop: "1.25rem",
                padding: "0.875rem",
                borderRadius: "10px",
                border: "none",
                background: "#1e9e75",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Place a bet
            </button>
          )}
        </div>

        {/* Position panel */}
        {position.hasPosition && (
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "16px",
            padding: "1.25rem",
          }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
              Your position
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
              {[
                { label: `${market.homeTeam} (Home)`, shares: position.sharesHome, color: "#1e9e75" },
                { label: `${market.awayTeam} (Away)`, shares: position.sharesAway, color: "#3266ad" },
                { label: "Draw",                       shares: position.sharesDraw, color: "#888780" },
              ]
                .filter((r) => r.shares > 0n)
                .map((row) => (
                  <div key={row.label} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "8px",
                    background: "var(--color-background-secondary)",
                  }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 500, color: row.color }}>{row.label}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>{formatUsdc(row.shares)} shares</div>
                    </div>
                  </div>
                ))
              }
            </div>

            {position.claimed && (
              <div style={{
                padding: "0.625rem",
                borderRadius: "8px",
                background: "var(--color-background-success)",
                color: "var(--color-text-success)",
                fontSize: "0.8rem",
                fontWeight: 500,
                textAlign: "center",
              }}>
                ✓ Winnings claimed
              </div>
            )}

            {canClaim && (
              <button
                onClick={() => void handleClaim()}
                disabled={claiming}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "none",
                  background: "#1e9e75",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: claiming ? "not-allowed" : "pointer",
                  opacity: claiming ? 0.6 : 1,
                }}
              >
                {claiming ? "Claiming…" : "🏆 Claim winnings"}
              </button>
            )}

            {/* OKX DEX link for secondary trading */}
            {market.isOpen && (
              <a
                href={`https://www.okx.com/web3/dex-swap?chainId=${195}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "0.625rem",
                  fontSize: "0.75rem",
                  color: "var(--color-text-tertiary)",
                  textDecoration: "none",
                }}
              >
                Trade on OKX DEX →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Contract link */}
      <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>
        Market #{market.id.toString()} ·{" "}
        <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-tertiary)" }}>
          View contract
        </a>
      </p>

      {showBetModal && (
        <BetModal
          market={market}
          onClose={() => setShowBetModal(false)}
          onSuccess={refetch}
        />
      )}
    </main>
  );
}
