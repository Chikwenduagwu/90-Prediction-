/**
 * MatchCard.tsx — Market card for the home page grid
 * Shows teams, odds, volume, status, countdown
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Market } from "@/hooks/useMarkets";
import { CountdownTimer } from "./CountdownTimer";
import { BetModal } from "./BetModal";
import { formatUsdc } from "@/lib/lmsr";
import { getCompetitionMeta } from "@/lib/footballData";

interface MatchCardProps {
  market: Market;
  onRefresh?: () => void;
}

// Momentum indicator: which team has more shares (volume)
function getMomentum(market: Market): "home" | "away" | "even" {
  const home = Number(market.shares[0]);
  const away = Number(market.shares[1]);
  const diff = home - away;
  if (Math.abs(diff) < 1_000_000) return "even";
  return diff > 0 ? "home" : "away";
}

export function MatchCard({ market, onRefresh }: MatchCardProps) {
  const navigate = useNavigate();
  const [showBetModal, setShowBetModal] = useState(false);

  const meta = getCompetitionMeta(market.league);
  const momentum = getMomentum(market);

  const statusBadge = (() => {
    if (market.resolved)  return { label: "Settled",   bg: "var(--color-background-success)", color: "var(--color-text-success)" };
    if (market.cancelled) return { label: "Cancelled", bg: "var(--color-background-danger)",  color: "var(--color-text-danger)"  };
    if (!market.isOpen)   return { label: "Closed",    bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" };
    return { label: "Open", bg: "rgba(30,158,117,0.1)", color: "#1e9e75" };
  })();

  return (
    <>
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "14px",
          padding: "1.25rem",
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-secondary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-tertiary)";
        }}
        onClick={() => navigate(`/match/${market.id}`)}
      >
        {/* Momentum bar — subtle top accent */}
        {market.isOpen && momentum !== "even" && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: momentum === "home" ? 0 : "auto",
              right: momentum === "away" ? 0 : "auto",
              width: "30%",
              height: "2px",
              background: "#1e9e75",
              opacity: 0.6,
              borderRadius: momentum === "home" ? "0 0 4px 0" : "0 0 0 4px",
            }}
          />
        )}

        {/* League + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 500 }}>
            {meta.flag} {meta.name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "6px",
              background: statusBadge.bg,
              color: statusBadge.color,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{ textAlign: "left" }}>
            <p style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
            }}>
              {market.homeTeam}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>Home</p>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", fontWeight: 500 }}>vs</span>
          <div style={{ textAlign: "right" }}>
            <p style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
            }}>
              {market.awayTeam}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>Away</p>
          </div>
        </div>

        {/* Odds row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "0.875rem" }}>
          {[
            { label: "1", value: market.oddsHome, prob: market.probHome, color: "#1e9e75" },
            { label: "X", value: market.oddsDraw, prob: market.probDraw, color: "#888780" },
            { label: "2", value: market.oddsAway, prob: market.probAway, color: "#3266ad" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                textAlign: "center",
                padding: "0.5rem 0.25rem",
                borderRadius: "8px",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <div style={{ fontSize: "0.65rem", color: "var(--color-text-tertiary)", marginBottom: "2px" }}>{item.label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: item.color }}>{item.value.toFixed(2)}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--color-text-tertiary)" }}>{Math.round(item.prob * 100)}%</div>
            </div>
          ))}
        </div>

        {/* Footer: volume + countdown + bet button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>
              Vol: {formatUsdc(market.totalVolume, 0)} USDC
            </span>
            {market.isOpen && (
              <div style={{ marginTop: "2px" }}>
                <CountdownTimer targetTimestamp={market.closingTime} label="" />
              </div>
            )}
          </div>

          {market.isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBetModal(true);
              }}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "#1e9e75",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Bet
            </button>
          )}
        </div>

        {/* Momentum indicator label */}
        {market.isOpen && momentum !== "even" && (
          <div style={{
            marginTop: "0.625rem",
            fontSize: "0.65rem",
            color: "#1e9e75",
            opacity: 0.8,
          }}>
            ↑ Momentum: {momentum === "home" ? market.homeTeam : market.awayTeam}
          </div>
        )}
      </div>

      {showBetModal && (
        <BetModal
          market={market}
          onClose={() => setShowBetModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
