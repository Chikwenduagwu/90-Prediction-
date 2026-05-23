/**
 * Portfolio.tsx — User positions across all markets + claimable winnings
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useReadContracts } from "wagmi";
import { useMarkets } from "@/hooks/useMarkets";
import { useBet } from "@/hooks/useBet";
import { useUsdcBalance } from "@/hooks/useBet";
import { formatUsdc } from "@/lib/lmsr";
import { CONTRACT_ADDRESS } from "@/lib/wagmiConfig";
import { PREDICTION_MARKET_ABI } from "@/lib/contractAbi";
import type { Market } from "@/hooks/useMarkets";

interface PositionRow {
  market: Market;
  sharesHome: bigint;
  sharesAway: bigint;
  sharesDraw: bigint;
  claimed: boolean;
  canClaim: boolean;
  estimatedValue: bigint;
}

export function Portfolio() {
  const { address } = useAccount();
  const { login, authenticated } = usePrivy();
  const { markets, isLoading: marketsLoading } = useMarkets();
  const { balance } = useUsdcBalance(address);
  const { claimWinnings, isLoading: claiming } = useBet();
  const navigate = useNavigate();
  const [claimingId, setClaimingId] = useState<bigint | null>(null);

  // Batch-fetch all positions for the connected user
  const { data: positionsData, refetch: refetchPositions } = useReadContracts({
    contracts: markets.map((m) => ({
      address: CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getPosition" as const,
      args: [m.id, address ?? "0x0000000000000000000000000000000000000000"] as const,
    })),
    query: { enabled: !!address && markets.length > 0 },
  });

  // Build enriched position rows
  const positionRows: PositionRow[] = [];
  if (positionsData && markets.length > 0) {
    markets.forEach((market, i) => {
      const raw = positionsData[i]?.result as
        | { sharesHome: bigint; sharesAway: bigint; sharesDraw: bigint; claimed: boolean }
        | undefined;

      if (!raw) return;
      const { sharesHome, sharesAway, sharesDraw, claimed } = raw;
      if (sharesHome === 0n && sharesAway === 0n && sharesDraw === 0n) return;

      // Can claim if resolved and holds winning shares and not yet claimed
      const canClaim =
        market.resolved &&
        !claimed &&
        ((market.winner === 1 && sharesHome > 0n) ||
          (market.winner === 2 && sharesAway > 0n) ||
          (market.winner === 3 && sharesDraw > 0n));

      // Estimate current value based on LMSR odds
      const ownedValue =
        BigInt(Math.round(Number(sharesHome) * market.probHome)) +
        BigInt(Math.round(Number(sharesAway) * market.probAway)) +
        BigInt(Math.round(Number(sharesDraw) * market.probDraw));

      positionRows.push({
        market,
        sharesHome,
        sharesAway,
        sharesDraw,
        claimed,
        canClaim,
        estimatedValue: ownedValue,
      });
    });
  }

  const openPositions = positionRows.filter((r) => r.market.isOpen || (!r.market.resolved && !r.market.cancelled));
  const settledPositions = positionRows.filter((r) => r.market.resolved || r.market.cancelled);
  const claimablePositions = positionRows.filter((r) => r.canClaim);

  const totalEstimatedValue = positionRows.reduce((sum, r) => sum + r.estimatedValue, 0n);
  const totalClaimable = claimablePositions.length;

  const handleClaim = async (marketId: bigint) => {
    setClaimingId(marketId);
    await claimWinnings(marketId);
    void refetchPositions();
    setClaimingId(null);
  };

  const handleClaimAll = async () => {
    for (const row of claimablePositions) {
      await claimWinnings(row.market.id);
    }
    void refetchPositions();
  };

  if (!authenticated) {
    return (
      <main style={{ maxWidth: "800px", margin: "4rem auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{
          padding: "3rem",
          borderRadius: "16px",
          border: "0.5px dashed var(--color-border-tertiary)",
        }}>
          <p style={{ fontSize: "2rem", margin: "0 0 0.75rem" }}>🏆</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--color-text-primary)" }}>
            Your Portfolio
          </h1>
          <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>
            Connect your wallet to view your positions and claim winnings
          </p>
          <button
            onClick={() => void login()}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "10px",
              border: "none",
              background: "#1e9e75",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Connect wallet
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "0 0 0.25rem",
          letterSpacing: "-0.02em",
        }}>
          Portfolio
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          Your prediction market positions on GoalMarket
        </p>
      </div>

      {/* Summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px",
        marginBottom: "2rem",
      }}>
        {[
          {
            label: "USDC Balance",
            value: `${formatUsdc(balance)}`,
            sub: "available",
            color: "var(--color-text-primary)",
          },
          {
            label: "Open Positions",
            value: String(openPositions.length),
            sub: "active markets",
            color: "var(--color-text-primary)",
          },
          {
            label: "Est. Portfolio",
            value: `${formatUsdc(totalEstimatedValue, 0)}`,
            sub: "USDC",
            color: "var(--color-text-primary)",
          },
          {
            label: "Claimable",
            value: String(totalClaimable),
            sub: totalClaimable > 0 ? "ready to claim" : "nothing pending",
            color: totalClaimable > 0 ? "var(--color-text-success)" : "var(--color-text-secondary)",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--color-background-secondary)",
              borderRadius: "12px",
              padding: "1rem",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {card.label}
            </p>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 600, color: card.color }}>
              {card.value}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Claim all banner */}
      {claimablePositions.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          background: "var(--color-background-success)",
          border: "0.5px solid var(--color-border-success)",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-success)", fontSize: "0.95rem" }}>
              🎉 You have {claimablePositions.length} winning position{claimablePositions.length > 1 ? "s" : ""}!
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-success)", opacity: 0.8 }}>
              Claim your USDC winnings now
            </p>
          </div>
          <button
            onClick={() => void handleClaimAll()}
            disabled={claiming}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: "#1e9e75",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: claiming ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            {claiming ? "Claiming…" : "Claim all"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {marketsLoading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "0.875rem" }}>
          Loading your positions…
        </div>
      )}

      {/* Open positions */}
      {openPositions.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 0.75rem",
          }}>
            Open positions · {openPositions.length}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {openPositions.map((row) => (
              <PositionCard
                key={row.market.id.toString()}
                row={row}
                onClaim={() => void handleClaim(row.market.id)}
                isClaiming={claiming && claimingId === row.market.id}
                onClick={() => navigate(`/match/${row.market.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Settled positions */}
      {settledPositions.length > 0 && (
        <section>
          <h2 style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 0.75rem",
          }}>
            Settled · {settledPositions.length}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {settledPositions.map((row) => (
              <PositionCard
                key={row.market.id.toString()}
                row={row}
                onClaim={() => void handleClaim(row.market.id)}
                isClaiming={claiming && claimingId === row.market.id}
                onClick={() => navigate(`/match/${row.market.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!marketsLoading && positionRows.length === 0 && (
        <div style={{
          padding: "3rem",
          textAlign: "center",
          border: "0.5px dashed var(--color-border-tertiary)",
          borderRadius: "14px",
        }}>
          <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>⚽</p>
          <p style={{ fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 0.25rem" }}>
            No positions yet
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: "0 0 1.25rem" }}>
            Place your first bet on an upcoming match
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "#1e9e75",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Browse markets
          </button>
        </div>
      )}
    </main>
  );
}

// ─── Position Card ────────────────────────────────────────────────────────────

function PositionCard({
  row,
  onClaim,
  isClaiming,
  onClick,
}: {
  row: PositionRow;
  onClaim: () => void;
  isClaiming: boolean;
  onClick: () => void;
}) {
  const { market } = row;

  const outcomeLabel = (shares: bigint, label: string, color: string) => {
    if (shares === 0n) return null;
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        borderRadius: "6px",
        background: "var(--color-background-secondary)",
        fontSize: "0.78rem",
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
        <span style={{ color: "var(--color-text-tertiary)" }}>{formatUsdc(shares, 0)} sh</span>
      </div>
    );
  };

  const statusInfo = (() => {
    if (row.canClaim)       return { label: "Won!", color: "var(--color-text-success)", bg: "var(--color-background-success)" };
    if (row.claimed)        return { label: "Claimed", color: "var(--color-text-tertiary)", bg: "var(--color-background-secondary)" };
    if (market.resolved)    return { label: "Lost", color: "var(--color-text-danger)", bg: "var(--color-background-danger)" };
    if (market.cancelled)   return { label: "Refundable", color: "var(--color-text-warning)", bg: "var(--color-background-warning)" };
    if (!market.isOpen)     return { label: "Awaiting result", color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)" };
    return { label: "Active", color: "#1e9e75", bg: "rgba(30,158,117,0.08)" };
  })();

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onClick={onClick}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-secondary)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-tertiary)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        {/* Left: match info + positions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "6px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
              {market.homeTeam} vs {market.awayTeam}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>{market.league}</span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {outcomeLabel(row.sharesHome, market.homeTeam, "#1e9e75")}
            {outcomeLabel(row.sharesAway, market.awayTeam, "#3266ad")}
            {outcomeLabel(row.sharesDraw, "Draw", "#888780")}
          </div>
        </div>

        {/* Right: status + action */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <span style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: "6px",
            background: statusInfo.bg,
            color: statusInfo.color,
          }}>
            {statusInfo.label}
          </span>

          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
            ~{formatUsdc(row.estimatedValue, 0)} USDC
          </span>

          {row.canClaim && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClaim();
              }}
              disabled={isClaiming}
              style={{
                padding: "0.4rem 0.875rem",
                borderRadius: "7px",
                border: "none",
                background: "#1e9e75",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: isClaiming ? "not-allowed" : "pointer",
                opacity: isClaiming ? 0.6 : 1,
              }}
            >
              {isClaiming ? "…" : "Claim"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
