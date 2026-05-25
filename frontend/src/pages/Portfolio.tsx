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
  sharesHome: bigint; sharesAway: bigint; sharesDraw: bigint;
  claimed: boolean; canClaim: boolean; estimatedValue: bigint;
}

export function Portfolio() {
  const { address } = useAccount();
  const { login, authenticated } = usePrivy();
  const { markets, isLoading: marketsLoading } = useMarkets();
  const { balance } = useUsdcBalance(address);
  const { claimWinnings, isLoading: claiming } = useBet();
  const navigate = useNavigate();
  const [claimingId, setClaimingId] = useState<bigint | null>(null);

  const { data: positionsData, refetch } = useReadContracts({
    contracts: markets.map((m) => ({
      address: CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getPosition" as const,
      args: [m.id, address ?? "0x0000000000000000000000000000000000000000"] as const,
    })),
    query: { enabled: !!address && markets.length > 0 },
  });

  const rows: PositionRow[] = [];
  if (positionsData) {
    markets.forEach((market, i) => {
      const raw = positionsData[i]?.result as
        | { sharesHome: bigint; sharesAway: bigint; sharesDraw: bigint; claimed: boolean }
        | undefined;
      if (!raw) return;
      const { sharesHome, sharesAway, sharesDraw, claimed } = raw;
      if (sharesHome === 0n && sharesAway === 0n && sharesDraw === 0n) return;
      const canClaim = market.resolved && !claimed && (
        (market.winner === 1 && sharesHome > 0n) ||
        (market.winner === 2 && sharesAway > 0n) ||
        (market.winner === 3 && sharesDraw > 0n)
      );
      const estimatedValue =
        BigInt(Math.round(Number(sharesHome) * market.probHome)) +
        BigInt(Math.round(Number(sharesAway) * market.probAway)) +
        BigInt(Math.round(Number(sharesDraw) * market.probDraw));
      rows.push({ market, sharesHome, sharesAway, sharesDraw, claimed, canClaim, estimatedValue });
    });
  }

  const open     = rows.filter((r) => r.market.isOpen || (!r.market.resolved && !r.market.cancelled));
  const settled  = rows.filter((r) => r.market.resolved || r.market.cancelled);
  const claimable = rows.filter((r) => r.canClaim);
  const totalValue = rows.reduce((s, r) => s + r.estimatedValue, 0n);

  const handleClaim = async (marketId: bigint) => {
    setClaimingId(marketId);
    await claimWinnings(marketId);
    void refetch();
    setClaimingId(null);
  };

  if (!authenticated) return (
    <main style={{ maxWidth: "600px", margin: "4rem auto", padding: "0 1rem" }}>
      <div style={{
        padding: "3rem 2rem", textAlign: "center",
        background: "var(--bg-glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--r-2xl)",
        boxShadow: "var(--shadow-float)",
      }}>
        <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏆</p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
          Your Portfolio
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", fontSize: "0.9rem" }}>
          Connect to view your positions and claim winnings
        </p>
        <button onClick={() => void login()} style={{
          padding: "0.75rem 2rem", borderRadius: "var(--r-md)",
          border: "none", background: "var(--black)", color: "#fff",
          fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}>
          Connect Wallet
        </button>
      </div>
    </main>
  );

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.25rem 1rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "clamp(1.4rem, 5vw, 1.75rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Portfolio
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Your prediction market positions
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "10px", marginBottom: "1.75rem",
      }}>
        {[
          { label: "USDC Balance",    value: formatUsdc(balance),           sub: "available",       accent: false },
          { label: "Open Positions",  value: String(open.length),           sub: "active markets",  accent: false },
          { label: "Est. Value",      value: formatUsdc(totalValue, 0),     sub: "USDC",            accent: false },
          { label: "Claimable",       value: String(claimable.length),      sub: claimable.length > 0 ? "ready!" : "nothing pending", accent: claimable.length > 0 },
        ].map((c) => (
          <div key={c.label} style={{
            background: c.accent ? "var(--orange-light)" : "var(--bg-glass)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `0.5px solid ${c.accent ? "var(--border-orange)" : "var(--border)"}`,
            borderRadius: "var(--r-lg)",
            padding: "1rem",
            boxShadow: "var(--shadow-card)",
            display: "flex", flexDirection: "column", gap: "2px",
          }}>
            <span style={{ fontSize: "0.65rem", color: c.accent ? "var(--orange)" : "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              {c.label}
            </span>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, color: c.accent ? "var(--orange)" : "var(--text-primary)", lineHeight: 1.1 }}>
              {c.value}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>{c.sub}</span>
          </div>
        ))}
      </div>

      {/* Claim all banner */}
      {claimable.length > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 1.25rem", borderRadius: "var(--r-lg)",
          background: "linear-gradient(135deg, var(--orange-light), rgba(255,107,0,0.05))",
          border: "1px solid var(--border-orange)",
          marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontWeight: 700, color: "var(--orange)", fontSize: "0.95rem" }}>
              🎉 {claimable.length} winning position{claimable.length > 1 ? "s" : ""} ready!
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Claim your USDC now
            </p>
          </div>
          <button onClick={() => void Promise.all(claimable.map((r) => claimWinnings(r.market.id))).then(() => refetch())}
            disabled={claiming} style={{
              padding: "0.6rem 1.25rem", borderRadius: "var(--r-md)",
              border: "none", background: "var(--orange)", color: "#fff",
              fontWeight: 700, fontSize: "0.875rem",
              cursor: claiming ? "not-allowed" : "pointer", flexShrink: 0,
              boxShadow: "0 4px 16px rgba(255,107,0,0.25)",
            }}>
            Claim all
          </button>
        </div>
      )}

      {marketsLoading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-tertiary)" }}>
          Loading positions…
        </div>
      )}

      {open.length > 0 && (
        <section style={{ marginBottom: "1.75rem" }}>
          <SectionLabel count={open.length}>Open Positions</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {open.map((r) => (
              <PositionCard key={r.market.id.toString()} row={r}
                onClaim={() => void handleClaim(r.market.id)}
                isClaiming={claiming && claimingId === r.market.id}
                onClick={() => navigate(`/match/${r.market.id}`)} />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <SectionLabel count={settled.length}>Settled</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {settled.map((r) => (
              <PositionCard key={r.market.id.toString()} row={r}
                onClaim={() => void handleClaim(r.market.id)}
                isClaiming={claiming && claimingId === r.market.id}
                onClick={() => navigate(`/match/${r.market.id}`)} />
            ))}
          </div>
        </section>
      )}

      {!marketsLoading && rows.length === 0 && (
        <div style={{
          padding: "3rem 2rem", textAlign: "center",
          border: "1px dashed var(--border-mid)", borderRadius: "var(--r-xl)",
          background: "var(--bg-glass)",
        }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚽</p>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>No positions yet</p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Place your first bet on an upcoming match
          </p>
          <button onClick={() => navigate("/")} style={{
            padding: "0.6rem 1.5rem", borderRadius: "var(--r-md)",
            border: "none", background: "var(--black)", color: "#fff",
            fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
          }}>
            Browse markets
          </button>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
      <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {children}
      </h2>
      {count !== undefined && (
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "20px",
          background: "var(--orange-light)", color: "var(--orange)", border: "0.5px solid var(--border-orange)",
        }}>{count}</span>
      )}
    </div>
  );
}

function PositionCard({ row, onClaim, isClaiming, onClick }: {
  row: PositionRow; onClaim: () => void; isClaiming: boolean; onClick: () => void;
}) {
  const { market } = row;
  const status = (() => {
    if (row.canClaim)     return { label: "Won! 🏆",        color: "var(--orange)",         bg: "var(--orange-light)",   border: "var(--border-orange)" };
    if (row.claimed)      return { label: "Claimed ✓",      color: "var(--green)",           bg: "var(--green-bg)",       border: "rgba(22,163,74,.25)" };
    if (market.resolved)  return { label: "Lost",           color: "var(--red)",             bg: "var(--red-bg)",         border: "rgba(220,38,38,.2)" };
    if (market.cancelled) return { label: "Refundable",     color: "var(--amber)",           bg: "var(--amber-bg)",       border: "rgba(217,119,6,.2)" };
    if (!market.isOpen)   return { label: "Awaiting result",color: "var(--text-secondary)",  bg: "var(--bg-subtle)",      border: "var(--border)" };
    return { label: "Active",       color: "var(--orange)",         bg: "var(--orange-light)",   border: "var(--border-orange)" };
  })();

  const chips = [
    { label: market.homeTeam, shares: row.sharesHome, color: "var(--orange)" },
    { label: market.awayTeam, shares: row.sharesAway, color: "var(--blue)"   },
    { label: "Draw",          shares: row.sharesDraw,  color: "var(--text-tertiary)" },
  ].filter((c) => c.shares > 0n);

  return (
    <div onClick={onClick} style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: "1rem", padding: "1rem 1.125rem",
      background: "var(--bg-glass)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "0.5px solid var(--border)",
      borderRadius: "var(--r-lg)",
      cursor: "pointer", boxShadow: "var(--shadow-card)",
      transition: "transform 0.12s, box-shadow 0.12s",
      flexWrap: "wrap",
    }}
    onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "var(--shadow-float)"; }}
    onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.boxShadow = "var(--shadow-card)"; }}
    >
      <div style={{ flex: 1, minWidth: "180px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "6px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)" }}>
            {market.homeTeam} vs {market.awayTeam}
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>{market.league}</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {chips.map((c) => (
            <span key={c.label} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "3px 8px", borderRadius: "20px",
              background: "var(--bg-subtle-2)", border: "0.5px solid var(--border)",
              fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
              {c.label} · {formatUsdc(c.shares, 0)} sh
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
          background: status.bg, color: status.color, border: `0.5px solid ${status.border}`,
        }}>
          {status.label}
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          ~{formatUsdc(row.estimatedValue, 0)} USDC
        </span>
        {row.canClaim && (
          <button onClick={(e) => { e.stopPropagation(); onClaim(); }} disabled={isClaiming} style={{
            padding: "0.4rem 0.875rem", borderRadius: "var(--r-md)",
            border: "none", background: "var(--orange)", color: "#fff",
            fontWeight: 700, fontSize: "0.78rem",
            cursor: isClaiming ? "not-allowed" : "pointer",
            opacity: isClaiming ? 0.6 : 1,
            boxShadow: "0 2px 10px rgba(255,107,0,0.25)",
          }}>
            {isClaiming ? "…" : "Claim"}
          </button>
        )}
      </div>
    </div>
  );
}
