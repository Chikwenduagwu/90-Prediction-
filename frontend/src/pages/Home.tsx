/**
 * Home.tsx — Markets listing page
 */

import { useState, useEffect } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MatchCard } from "@/components/MatchCard";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchUpcomingMatches, type FDMatch, COMPETITIONS, getCompetitionMeta } from "@/lib/footballData";

type FilterLeague = "all" | keyof typeof COMPETITIONS;

export function Home() {
  const { markets, isLoading: marketsLoading, refetch } = useMarkets();
  const [fixtures, setFixtures] = useState<FDMatch[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterLeague>("all");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Only fetch fixtures if API key is configured
  useEffect(() => {
    const key = import.meta.env.VITE_FOOTBALL_DATA_API_KEY;
    if (!key) return; // skip silently if not configured

    setFixturesLoading(true);
    fetchUpcomingMatches()
      .then(setFixtures)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load fixtures";
        setFixturesError(msg);
      })
      .finally(() => setFixturesLoading(false));
  }, []);

  const filteredMarkets = filter === "all"
    ? markets
    : markets.filter((m) => m.league === COMPETITIONS[filter as keyof typeof COMPETITIONS].name);

  const openMarkets   = filteredMarkets.filter((m) => m.isOpen);
  const closedMarkets = filteredMarkets.filter((m) => !m.isOpen);

  return (
    <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Hero */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)",
          margin: "0 0 0.375rem", letterSpacing: "-0.03em",
        }}>
          Predict. Trade. Win. ⚽
        </h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
          Real-time prediction markets on football matches · Powered by LMSR · No OKB needed
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem",
      }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", ...Object.keys(COMPETITIONS)] as FilterLeague[]).map((code) => {
            const meta = code === "all" ? null : getCompetitionMeta(code);
            return (
              <button key={code} onClick={() => setFilter(code)} style={{
                padding: "0.3rem 0.75rem", borderRadius: "20px", border: "0.5px solid",
                borderColor: filter === code ? "#1e9e75" : "var(--color-border-tertiary)",
                background: filter === code ? "rgba(30,158,117,0.1)" : "none",
                color: filter === code ? "#1e9e75" : "var(--color-text-secondary)",
                cursor: "pointer", fontSize: "0.78rem",
                fontWeight: filter === code ? 600 : 400, transition: "all 0.15s",
              }}>
                {meta ? `${meta.flag} ${meta.code}` : "All leagues"}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowLeaderboard((v) => !v)} style={{
          padding: "0.35rem 0.875rem", borderRadius: "8px",
          border: "0.5px solid var(--color-border-secondary)",
          background: showLeaderboard ? "var(--color-background-secondary)" : "none",
          color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "0.8rem",
        }}>
          🏆 {showLeaderboard ? "Hide" : "Show"} Leaderboard
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: showLeaderboard ? "1fr 340px" : "1fr",
        gap: "1.5rem", alignItems: "start",
      }}>
        {/* Markets column */}
        <div>
          {marketsLoading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-tertiary)" }}>
              Loading markets…
            </div>
          ) : openMarkets.length > 0 ? (
            <>
              <h2 style={{
                fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-tertiary)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem",
              }}>
                Open markets · {openMarkets.length}
              </h2>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem", marginBottom: "2rem",
              }}>
                {openMarkets.map((m) => (
                  <MatchCard key={m.id.toString()} market={m} onRefresh={refetch} />
                ))}
              </div>
            </>
          ) : null}

          {closedMarkets.length > 0 && (
            <>
              <h2 style={{
                fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-tertiary)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem",
              }}>
                Recent results
              </h2>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem", marginBottom: "2rem",
              }}>
                {closedMarkets.slice(0, 6).map((m) => (
                  <MatchCard key={m.id.toString()} market={m} />
                ))}
              </div>
            </>
          )}

          {/* Football-Data upcoming fixtures */}
          {!fixturesLoading && !fixturesError && fixtures.length > 0 && (
            <>
              <h2 style={{
                fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-tertiary)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem",
              }}>
                Upcoming fixtures
                <span style={{
                  fontSize: "0.6rem", padding: "2px 6px", borderRadius: "4px",
                  background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)",
                  fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: "6px",
                }}>
                  football-data.org
                </span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {fixtures.slice(0, 10).map((f) => <FixtureRow key={f.id} match={f} />)}
              </div>
            </>
          )}

          {!marketsLoading && markets.length === 0 && (
            <div style={{
              padding: "3rem", textAlign: "center", color: "var(--color-text-tertiary)",
              border: "0.5px dashed var(--color-border-tertiary)", borderRadius: "14px",
            }}>
              <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>⚽</p>
              <p style={{ margin: 0, fontWeight: 500, color: "var(--color-text-secondary)" }}>No markets yet</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
                Deploy the contract and run the seed script to create markets.
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        {showLeaderboard && (
          <aside>
            <div style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "14px", padding: "1.25rem",
              position: "sticky", top: "76px",
            }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
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

function FixtureRow({ match }: { match: FDMatch }) {
  const kickoff = new Date(match.utcDate);
  const meta = getCompetitionMeta(match.competition.code);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.625rem 0.875rem", borderRadius: "10px",
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
    }}>
      <span style={{ fontSize: "0.8rem", minWidth: "16px" }}>{meta.flag}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
          {match.homeTeam.shortName}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>vs</span>
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
          {match.awayTeam.shortName}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
          {kickoff.toLocaleDateString("en", { month: "short", day: "numeric" })}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
          {kickoff.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
