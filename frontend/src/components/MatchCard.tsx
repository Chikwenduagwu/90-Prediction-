import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Market } from "@/hooks/useMarkets";
import { CountdownTimer } from "./CountdownTimer";
import { BetModal } from "./BetModal";
import { formatUsdc } from "@/lib/lmsr";
import { getCompetitionMeta } from "@/lib/footballData";

interface MatchCardProps { market: Market; onRefresh?: () => void; }

function getMomentum(market: Market): "home" | "away" | "even" {
  const diff = Number(market.shares[0]) - Number(market.shares[1]);
  if (Math.abs(diff) < 1_000_000) return "even";
  return diff > 0 ? "home" : "away";
}

export function MatchCard({ market, onRefresh }: MatchCardProps) {
  const navigate = useNavigate();
  const [showBetModal, setShowBetModal] = useState(false);
  const meta = getCompetitionMeta(market.league);
  const momentum = getMomentum(market);

  const badge = (() => {
    if (market.resolved)  return { label: "Settled",   color: "var(--green)",  bg: "var(--green-bg)"  };
    if (market.cancelled) return { label: "Cancelled", color: "var(--red)",    bg: "var(--red-bg)"    };
    if (!market.isOpen)   return { label: "Closed",    color: "var(--text-tertiary)", bg: "var(--bg-subtle-2)" };
    return { label: "Live", color: "var(--orange)", bg: "var(--orange-light)" };
  })();

  const oddsItems = [
    { label: "1", name: market.homeTeam, value: market.oddsHome, prob: market.probHome },
    { label: "X", name: "Draw",          value: market.oddsDraw, prob: market.probDraw },
    { label: "2", name: market.awayTeam, value: market.oddsAway, prob: market.probAway },
  ];

  return (
    <>
      <div
        onClick={() => navigate(`/match/${market.id}`)}
        style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "1.125rem",
          cursor: "pointer",
          boxShadow: "var(--shadow-card)",
          transition: "transform 0.15s, box-shadow 0.15s",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "var(--shadow-float)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "var(--shadow-card)";
        }}
      >
        {/* Momentum accent stripe */}
        {market.isOpen && momentum !== "even" && (
          <div style={{
            position: "absolute", top: 0,
            left: momentum === "home" ? 0 : "auto",
            right: momentum === "away" ? 0 : "auto",
            width: "28%", height: "2.5px",
            background: "linear-gradient(90deg, var(--orange), transparent)",
            ...(momentum === "away" && { background: "linear-gradient(270deg, var(--orange), transparent)" }),
          }} />
        )}

        {/* Row 1: League + status badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
            {meta.flag} {meta.name}
          </span>
          <span style={{
            fontSize: "0.62rem", fontWeight: 700, padding: "3px 8px",
            borderRadius: "20px", background: badge.bg, color: badge.color,
            textTransform: "uppercase", letterSpacing: "0.06em",
            border: `0.5px solid ${badge.color}22`,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Row 2: Teams */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.5rem" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.2 }}>
              {market.homeTeam}
            </p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Home</p>
          </div>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
            padding: "0.3rem 0.6rem",
            background: "var(--bg-subtle-2)", borderRadius: "var(--r-md)",
          }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.06em" }}>VS</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.2 }}>
              {market.awayTeam}
            </p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Away</p>
          </div>
        </div>

        {/* Row 3: Odds */}
        <div style={{ display: "flex", gap: "6px" }}>
          {oddsItems.map((item) => (
            <div key={item.label} style={{
              flex: 1, textAlign: "center", padding: "0.5rem 0.25rem",
              borderRadius: "var(--r-md)",
              background: "var(--bg-subtle)",
              border: "0.5px solid var(--border)",
              display: "flex", flexDirection: "column", gap: "1px",
            }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text-tertiary)", fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--black)" }}>{item.value.toFixed(2)}</span>
              <span style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}>{Math.round(item.prob * 100)}%</span>
            </div>
          ))}
        </div>

        {/* Row 4: Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
              Vol: {formatUsdc(market.totalVolume, 0)} USDC
            </span>
            {market.isOpen && <CountdownTimer targetTimestamp={market.closingTime} label="" />}
          </div>
          {market.isOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowBetModal(true); }}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: "var(--r-md)",
                border: "none",
                background: "var(--black)",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--orange)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--black)")}
            >
              Bet →
            </button>
          )}
        </div>

        {/* Momentum label */}
        {market.isOpen && momentum !== "even" && (
          <div style={{ fontSize: "0.62rem", color: "var(--orange)", fontWeight: 600 }}>
            🔥 Momentum: {momentum === "home" ? market.homeTeam : market.awayTeam}
          </div>
        )}
      </div>

      {showBetModal && (
        <BetModal market={market} onClose={() => setShowBetModal(false)} onSuccess={onRefresh} />
      )}
    </>
  );
}
