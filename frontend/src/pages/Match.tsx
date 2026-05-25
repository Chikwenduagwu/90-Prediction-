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

const WINNER_LABELS: Record<number, string> = { 1: "Home win", 2: "Away win", 3: "Draw" };

export function Match() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const marketId = id ? BigInt(id) : undefined;
  const { market, isLoading, refetch } = useMarket(marketId);
  const position = usePosition(marketId, address);
  const { claimWinnings, isLoading: claiming } = useBet();
  const [showBetModal, setShowBetModal] = useState(false);

  if (isLoading) return (
    <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-tertiary)" }}>Loading…</div>
  );

  if (!market) return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Market not found.</p>
      <button onClick={() => navigate("/")} style={{ color: "var(--orange)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
        ← Back
      </button>
    </div>
  );

  const meta = getCompetitionMeta(market.league);
  const kickoff = new Date(Number(market.matchTimestamp) * 1000);
  const canClaim = market.resolved && !position.claimed && (
    (market.winner === 1 && position.sharesHome > 0n) ||
    (market.winner === 2 && position.sharesAway > 0n) ||
    (market.winner === 3 && position.sharesDraw > 0n)
  );

  const oddsItems = [
    { label: "1", name: market.homeTeam, prob: market.probHome, odds: market.oddsHome, winner: market.winner === 1 },
    { label: "X", name: "Draw",          prob: market.probDraw, odds: market.oddsDraw, winner: market.winner === 3 },
    { label: "2", name: market.awayTeam, prob: market.probAway, odds: market.oddsAway, winner: market.winner === 2 },
  ];

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "1.25rem 1rem" }}>
      {/* Back */}
      <button onClick={() => navigate("/")} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-tertiary)", fontSize: "0.875rem",
        marginBottom: "1rem", padding: 0, display: "flex", alignItems: "center", gap: "4px",
      }}>
        ← All markets
      </button>

      {/* Match hero card */}
      <div style={{
        background: "var(--bg-glass)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--r-2xl)",
        padding: "1.5rem",
        boxShadow: "var(--shadow-float)",
        marginBottom: "1.125rem",
      }}>
        {/* League row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {meta.flag} {meta.name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {market.resolved && (
              <span style={{
                fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px",
                borderRadius: "20px", background: "var(--green-bg)",
                color: "var(--green)", border: "0.5px solid rgba(22,163,74,.3)",
              }}>
                ✓ {WINNER_LABELS[market.winner]}
              </span>
            )}
            {market.isOpen && <CountdownTimer targetTimestamp={market.closingTime} label="Closes" />}
          </div>
        </div>

        {/* Teams */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "var(--orange-light)", border: "1px solid var(--border-orange)",
              margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
            }}>🏠</div>
            <h1 style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", fontWeight: 800, color: "var(--text-primary)" }}>{market.homeTeam}</h1>
            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Home</p>
          </div>
          <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginBottom: "4px" }}>
              {kickoff.toLocaleDateString("en", { month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-tertiary)" }}>VS</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
              {kickoff.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "var(--bg-subtle-2)", border: "0.5px solid var(--border)",
              margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
            }}>✈️</div>
            <h2 style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", fontWeight: 800, color: "var(--text-primary)" }}>{market.awayTeam}</h2>
            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Away</p>
          </div>
        </div>

        {/* Odds buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem" }}>
          {oddsItems.map((item) => (
            <button key={item.label} onClick={() => market.isOpen && setShowBetModal(true)}
              disabled={!market.isOpen}
              style={{
                flex: 1, padding: "0.875rem 0.5rem",
                borderRadius: "var(--r-lg)",
                border: item.winner ? "2px solid var(--green)" : "1px solid var(--border)",
                background: item.winner ? "var(--green-bg)" : market.isOpen ? "var(--bg-subtle)" : "var(--bg-subtle)",
                cursor: market.isOpen ? "pointer" : "default",
                textAlign: "center", transition: "all 0.15s",
                display: "flex", flexDirection: "column", gap: "3px",
              }}
              onMouseEnter={(e) => { if (market.isOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--orange)"; }}
              onMouseLeave={(e) => { if (market.isOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = item.winner ? "var(--green)" : "var(--border)"; }}
            >
              <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 600 }}>{item.name}</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 900, color: item.winner ? "var(--green)" : "var(--black)" }}>
                {item.odds.toFixed(2)}x
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>{Math.round(item.prob * 100)}%</span>
              {/* prob bar */}
              <div style={{ height: "2px", borderRadius: "2px", background: "var(--border)", marginTop: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round(item.prob * 100)}%`, background: item.winner ? "var(--green)" : "var(--orange)", borderRadius: "2px", transition: "width 0.4s ease" }} />
              </div>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", paddingTop: "1rem", borderTop: "0.5px solid var(--border)" }}>
          {[
            { label: "Total volume", value: `${formatUsdc(market.totalVolume, 0)} USDC` },
            { label: "Fees", value: `${formatUsdc(market.feesCollected)} USDC` },
            { label: "Match ID", value: `#${market.externalMatchId}` },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "1px" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Position grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: position.hasPosition ? "1fr min(280px,100%)" : "1fr",
        gap: "1.125rem", alignItems: "start",
      }}>
        {/* Chart */}
        <div style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "1.5rem",
          boxShadow: "var(--shadow-card)",
        }}>
          <OddsChart market={market} />
          {market.isOpen && (
            <button onClick={() => setShowBetModal(true)} style={{
              width: "100%", marginTop: "1.25rem", padding: "0.875rem",
              borderRadius: "var(--r-md)", border: "none",
              background: "var(--orange)", color: "#fff",
              fontSize: "1rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(255,107,0,0.3)",
              transition: "box-shadow 0.15s",
            }}>
              Place a Bet →
            </button>
          )}
        </div>

        {/* Position */}
        {position.hasPosition && (
          <div style={{
            background: "var(--bg-glass)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "0.5px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "1.25rem",
            boxShadow: "var(--shadow-card)",
          }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>
              Your Position
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
              {[
                { label: `${market.homeTeam}`, shares: position.sharesHome, color: "var(--orange)" },
                { label: `${market.awayTeam}`, shares: position.sharesAway, color: "var(--blue)" },
                { label: "Draw",               shares: position.sharesDraw, color: "var(--text-tertiary)" },
              ].filter((r) => r.shares > 0n).map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.625rem 0.875rem", borderRadius: "var(--r-md)",
                  background: "var(--bg-subtle)", border: "0.5px solid var(--border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    {formatUsdc(row.shares)} sh
                  </span>
                </div>
              ))}
            </div>

            {position.claimed && (
              <div style={{
                padding: "0.625rem", borderRadius: "var(--r-md)",
                background: "var(--green-bg)", border: "0.5px solid rgba(22,163,74,.3)",
                color: "var(--green)", fontSize: "0.82rem", fontWeight: 600, textAlign: "center",
              }}>✓ Winnings claimed</div>
            )}

            {canClaim && (
              <button onClick={() => void claimWinnings(marketId!).then(() => refetch())}
                disabled={claiming} style={{
                  width: "100%", padding: "0.75rem",
                  borderRadius: "var(--r-md)", border: "none",
                  background: "var(--orange)", color: "#fff",
                  fontSize: "0.9rem", fontWeight: 700,
                  cursor: claiming ? "not-allowed" : "pointer",
                  opacity: claiming ? 0.6 : 1,
                  boxShadow: "0 4px 16px rgba(255,107,0,0.25)",
                }}>
                {claiming ? "Claiming…" : "🏆 Claim Winnings"}
              </button>
            )}

            <a href={`https://www.okx.com/web3/dex-swap?chainId=195`}
              target="_blank" rel="noopener noreferrer" style={{
                display: "block", textAlign: "center", marginTop: "0.75rem",
                fontSize: "0.72rem", color: "var(--text-tertiary)", textDecoration: "none",
              }}>
              Trade on OKX DEX →
            </a>
          </div>
        )}
      </div>

      <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
        Market #{market.id.toString()} ·{" "}
        <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--text-tertiary)" }}>View contract</a>
      </p>

      {showBetModal && (
        <BetModal market={market} onClose={() => setShowBetModal(false)} onSuccess={refetch} />
      )}
    </main>
  );
}
