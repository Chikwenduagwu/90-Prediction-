/**
 * Leaderboard.tsx — Top 10 traders by volume from on-chain events
 */

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { formatUsdc } from "@/lib/lmsr";
import { EXPLORER_URL } from "@/lib/wagmiConfig";

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { entries, isLoading, error } = useLeaderboard();

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "0.875rem" }}>
        Loading leaderboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "var(--color-text-danger)", fontSize: "0.875rem" }}>
        Failed to load leaderboard: {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "0.875rem" }}>
        No trades yet. Be the first!
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 100px 80px",
        padding: "0 0.75rem 0.5rem",
        gap: "0.5rem",
      }}>
        {["#", "Trader", "Volume", "Win %"].map((h) => (
          <span key={h} style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            textAlign: h === "Volume" || h === "Win %" ? "right" : "left",
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {entries.map((entry) => (
          <a
            key={entry.address}
            href={`${EXPLORER_URL}/address/${entry.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 100px 80px",
              padding: "0.75rem",
              gap: "0.5rem",
              borderRadius: "10px",
              background: entry.rank <= 3 ? "var(--color-background-secondary)" : "transparent",
              border: entry.rank <= 3
                ? "0.5px solid var(--color-border-tertiary)"
                : "0.5px solid transparent",
              textDecoration: "none",
              alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-background-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = entry.rank <= 3
                ? "var(--color-background-secondary)"
                : "transparent";
            }}
          >
            {/* Rank */}
            <span style={{
              fontSize: entry.rank <= 3 ? "1.1rem" : "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-tertiary)",
              textAlign: "center",
            }}>
              {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : entry.rank}
            </span>

            {/* Address */}
            <div>
              <span style={{
                fontFamily: "monospace",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}>
                {entry.displayAddress}
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", marginTop: "1px" }}>
                {entry.totalBets} bet{entry.totalBets !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Volume */}
            <span style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              textAlign: "right",
            }}>
              {formatUsdc(entry.totalVolume, 0)}
            </span>

            {/* Win rate */}
            <div style={{ textAlign: "right" }}>
              <span style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: entry.winRate >= 60
                  ? "var(--color-text-success)"
                  : entry.winRate >= 40
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              }}>
                {entry.winRate}%
              </span>
            </div>
          </a>
        ))}
      </div>

      <p style={{
        textAlign: "center",
        margin: "1rem 0 0",
        fontSize: "0.7rem",
        color: "var(--color-text-tertiary)",
      }}>
        Based on on-chain events · Updates every 30s
      </p>
    </div>
  );
}
