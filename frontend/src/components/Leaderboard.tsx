import { useLeaderboard } from "@/hooks/useLeaderboard";
import { formatUsdc } from "@/lib/lmsr";
import { EXPLORER_URL } from "@/lib/wagmiConfig";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { entries, isLoading, error } = useLeaderboard();

  if (isLoading) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
      Loading…
    </div>
  );

  if (error) return (
    <div style={{ padding: "1rem", color: "var(--red)", fontSize: "0.82rem",
      background: "var(--red-bg)", borderRadius: "var(--r-md)", border: "0.5px solid rgba(220,38,38,.2)" }}>
      {error}
    </div>
  );

  if (!entries.length) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
      No trades yet. Be first! ⚽
    </div>
  );

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: "flex", padding: "0 0.75rem 0.5rem", gap: "0.5rem" }}>
        {[
          { label: "#",      w: "28px"  },
          { label: "Trader", w: "1"     },
          { label: "Volume", w: "80px"  },
          { label: "Win %",  w: "52px"  },
        ].map(({ label, w }) => (
          <span key={label} style={{
            fontSize: "0.65rem", fontWeight: 700, color: "var(--text-tertiary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            width: w === "1" ? undefined : w, flex: w === "1" ? 1 : undefined,
            textAlign: label !== "#" && label !== "Trader" ? "right" : "left",
          }}>{label}</span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {entries.map((e) => (
          <a key={e.address} href={`${EXPLORER_URL}/address/${e.address}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 0.75rem",
              borderRadius: "var(--r-md)",
              background: e.rank <= 3 ? "var(--orange-light)" : "var(--bg-subtle)",
              border: `0.5px solid ${e.rank <= 3 ? "var(--border-orange)" : "var(--border)"}`,
              textDecoration: "none", transition: "background 0.15s",
            }}
            onMouseEnter={(el) => ((el.currentTarget as HTMLAnchorElement).style.background = "var(--orange-light)")}
            onMouseLeave={(el) => ((el.currentTarget as HTMLAnchorElement).style.background = e.rank <= 3 ? "var(--orange-light)" : "var(--bg-subtle)")}
          >
            <span style={{ width: "28px", textAlign: "center", fontSize: e.rank <= 3 ? "1rem" : "0.8rem", fontWeight: 700, color: "var(--text-tertiary)", flexShrink: 0 }}>
              {e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {e.displayAddress}
              </span>
              <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>{e.totalBets} bets</div>
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", width: "80px", textAlign: "right" }}>
              {formatUsdc(e.totalVolume, 0)}
            </span>
            <span style={{
              fontSize: "0.82rem", fontWeight: 700, width: "52px", textAlign: "right",
              color: e.winRate >= 60 ? "var(--green)" : e.winRate >= 40 ? "var(--text-primary)" : "var(--text-tertiary)",
            }}>
              {e.winRate}%
            </span>
          </a>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: "0.875rem", fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
        From on-chain events · refreshes every 30s
      </p>
    </div>
  );
}
