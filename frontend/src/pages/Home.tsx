import { useState, useEffect } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MatchCard } from "@/components/MatchCard";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchUpcomingMatches, type FDMatch, COMPETITIONS, getCompetitionMeta } from "@/lib/footballData";

type FilterLeague = "all" | keyof typeof COMPETITIONS;

export function Home() {
  const { markets, isLoading, refetch } = useMarkets();
  const [fixtures, setFixtures] = useState<FDMatch[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterLeague>("all");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_FOOTBALL_DATA_API_KEY) return;
    setFixturesLoading(true);
    fetchUpcomingMatches()
      .then(setFixtures)
      .catch((e: unknown) => setFixturesError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setFixturesLoading(false));
  }, []);

  const filtered = filter === "all" ? markets
    : markets.filter((m) => m.league === COMPETITIONS[filter as keyof typeof COMPETITIONS].name);
  const open   = filtered.filter((m) => m.isOpen);
  const closed = filtered.filter((m) => !m.isOpen);

  return (
    <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.25rem 1rem" }}>
      {/* Hero */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{
          fontSize: "clamp(1.6rem, 5vw, 2.25rem)",
          fontWeight: 900, letterSpacing: "-0.035em",
          color: "var(--text-primary)", lineHeight: 1.1,
        }}>
          Predict. Trade. Win.<br />
          <span style={{ color: "var(--orange)" }}>Football Markets.</span>
        </h1>
        <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "480px" }}>
          Real-time LMSR prediction markets on live matches · USDC only · No gas needed
        </p>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", ...Object.keys(COMPETITIONS)] as FilterLeague[]).map((code) => {
            const meta = code === "all" ? null : getCompetitionMeta(code);
            const active = filter === code;
            return (
              <button key={code} onClick={() => setFilter(code)} style={{
                padding: "0.3rem 0.7rem", borderRadius: "20px",
                border: `1px solid ${active ? "var(--orange)" : "var(--border)"}`,
                background: active ? "var(--orange-light)" : "var(--bg-glass)",
                backdropFilter: "blur(8px)",
                color: active ? "var(--orange)" : "var(--text-secondary)",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: active ? 700 : 500,
                transition: "all 0.12s",
              }}>
                {meta ? `${meta.flag} ${meta.code}` : "All"}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowLeaderboard((v) => !v)} style={{
          padding: "0.35rem 0.875rem", borderRadius: "20px",
          border: showLeaderboard ? "1px solid var(--border-orange)" : "1px solid var(--border)",
          background: showLeaderboard ? "var(--orange-light)" : "var(--bg-glass)",
          backdropFilter: "blur(8px)",
          color: showLeaderboard ? "var(--orange)" : "var(--text-secondary)",
          cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
        }}>
          🏆 Leaderboard
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: showLeaderboard ? "1fr min(320px, 100%)" : "1fr",
        gap: "1.25rem", alignItems: "start",
      }}>
        {/* Markets */}
        <div>
          {isLoading && (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>Loading markets…</div>
          )}

          {!isLoading && open.length > 0 && (
            <>
              <SectionLabel count={open.length}>Open Markets</SectionLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                gap: "1rem", marginBottom: "2rem",
              }}>
                {open.map((m) => <MatchCard key={m.id.toString()} market={m} onRefresh={refetch} />)}
              </div>
            </>
          )}

          {!isLoading && closed.length > 0 && (
            <>
              <SectionLabel count={closed.length}>Recent Results</SectionLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                gap: "1rem", marginBottom: "2rem",
              }}>
                {closed.slice(0, 6).map((m) => <MatchCard key={m.id.toString()} market={m} />)}
              </div>
            </>
          )}

          {!fixturesLoading && fixtures.length > 0 && (
            <>
              <SectionLabel>
                Upcoming Fixtures
                <span style={{
                  fontSize: "0.6rem", marginLeft: "6px", padding: "2px 6px",
                  borderRadius: "4px", background: "var(--bg-subtle-2)",
                  color: "var(--text-tertiary)", fontWeight: 400,
                }}>football-data.org</span>
              </SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1.5rem" }}>
                {fixtures.slice(0, 8).map((f) => <FixtureRow key={f.id} match={f} />)}
              </div>
            </>
          )}

          {!isLoading && markets.length === 0 && (
            <div style={{
              padding: "3rem 2rem", textAlign: "center",
              border: "1px dashed var(--border-mid)", borderRadius: "var(--r-xl)",
              background: "var(--bg-glass)",
            }}>
              <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚽</p>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>No markets yet</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Deploy the contract and seed markets to get started.</p>
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        {showLeaderboard && (
          <aside>
            <div style={{
              background: "var(--bg-glass)",
              backdropFilter: "blur(16px) saturate(160%)",
              WebkitBackdropFilter: "blur(16px) saturate(160%)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "1.25rem",
              boxShadow: "var(--shadow-card)",
              position: "sticky", top: "72px",
            }}>
              <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>
                🏆 Top Traders
              </h2>
              <Leaderboard />
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
      <h2 style={{
        fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {children}
      </h2>
      {count !== undefined && (
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px",
          borderRadius: "20px", background: "var(--orange-light)",
          color: "var(--orange)", border: "0.5px solid var(--border-orange)",
        }}>{count}</span>
      )}
    </div>
  );
}

function FixtureRow({ match }: { match: FDMatch }) {
  const kickoff = new Date(match.utcDate);
  const meta = getCompetitionMeta(match.competition.code);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.625rem 0.875rem", borderRadius: "var(--r-md)",
      background: "var(--bg-glass)",
      backdropFilter: "blur(8px)",
      border: "0.5px solid var(--border)",
    }}>
      <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{meta.flag}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {match.homeTeam.shortName}
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>vs</span>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {match.awayTeam.shortName}
        </span>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {kickoff.toLocaleDateString("en", { month: "short", day: "numeric" })}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
          {kickoff.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
