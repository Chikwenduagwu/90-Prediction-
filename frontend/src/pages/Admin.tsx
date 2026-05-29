import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS } from "@/lib/wagmiConfig";

// ─── Inline ABI for createMarket (avoids strict type conflicts) ───────────────
const CREATE_MARKET_ABI = [{
  name: "createMarket" as const,
  type: "function" as const,
  stateMutability: "nonpayable" as const,
  inputs: [
    { name: "homeTeam", type: "string" as const },
    { name: "awayTeam", type: "string" as const },
    { name: "league", type: "string" as const },
    { name: "matchTimestamp", type: "uint256" as const },
    { name: "externalMatchId", type: "string" as const },
  ],
  outputs: [] as const,
}] as const;



// ─── Hardcoded admin credentials (move to .env later) ───────────────────────
const ADMIN_EMAIL = "chikwenduagwu@gmail.com";
const ADMIN_PASSWORD = "Admin@90Predict!";

// ─── Preset market templates ─────────────────────────────────────────────────
const PRESETS = [
  {
    category: "🌍 World Cup",
    markets: [
      { homeTeam: "Winner", awayTeam: "World Cup 2026", league: "FIFA World Cup", question: "Who will win the 2026 World Cup?" },
      { homeTeam: "Argentina", awayTeam: "Round of 16", league: "FIFA World Cup", question: "Will Argentina make it to Round of 16?" },
      { homeTeam: "Best Player", awayTeam: "World Cup 2026", league: "FIFA World Cup", question: "Who will be Best Player of the World Cup?" },
      { homeTeam: "Golden Boot", awayTeam: "World Cup 2026", league: "FIFA World Cup", question: "Who will win the Golden Boot?" },
    ],
  },
  {
    category: "⚽ Premier League",
    markets: [
      { homeTeam: "Manchester City", awayTeam: "Arsenal", league: "Premier League", question: "Man City vs Arsenal" },
      { homeTeam: "Liverpool", awayTeam: "Chelsea", league: "Premier League", question: "Liverpool vs Chelsea" },
      { homeTeam: "Title Winner", awayTeam: "PL 2025/26", league: "Premier League", question: "Who wins the Premier League title?" },
    ],
  },
  {
    category: "🏆 Champions League",
    markets: [
      { homeTeam: "Real Madrid", awayTeam: "Bayern Munich", league: "UEFA Champions League", question: "Real Madrid vs Bayern Munich" },
      { homeTeam: "UCL Winner", awayTeam: "2025/26", league: "UEFA Champions League", question: "Who wins the Champions League?" },
    ],
  },
  {
    category: "🇪🇸 La Liga",
    markets: [
      { homeTeam: "Real Madrid", awayTeam: "Barcelona", league: "La Liga", question: "El Clásico — Real Madrid vs Barcelona" },
      { homeTeam: "La Liga Title", awayTeam: "2025/26", league: "La Liga", question: "Who wins La Liga?" },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketForm {
  homeTeam: string;
  awayTeam: string;
  league: string;
  question: string;
  matchDate: string;
  matchTime: string;
  externalMatchId: string;
}

const EMPTY_FORM: MarketForm = {
  homeTeam: "",
  awayTeam: "",
  league: "",
  question: "",
  matchDate: "",
  matchTime: "15:00",
  externalMatchId: "",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function Admin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState<MarketForm>(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Login handler ──
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPassword === ADMIN_PASSWORD) {
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials.");
    }
  }

  // ── Fill from preset ──
  function applyPreset(p: typeof PRESETS[0]["markets"][0]) {
    const tomorrow = new Date(Date.now() + 86400000 * 3);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setForm({
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      league: p.league,
      question: p.question,
      matchDate: dateStr,
      matchTime: "15:00",
      externalMatchId: `match_${Date.now()}`,
    });
    setSuccessMsg("");
    setErrorMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Submit market ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!form.homeTeam || !form.awayTeam || !form.league || !form.matchDate) {
      setErrorMsg("Please fill all required fields.");
      return;
    }

    const matchTimestamp = BigInt(
      Math.floor(new Date(`${form.matchDate}T${form.matchTime}:00`).getTime() / 1000)
    );
    const externalId = form.externalMatchId || `match_${Date.now()}`;

    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CREATE_MARKET_ABI,
        functionName: "createMarket",
        args: [form.homeTeam, form.awayTeam, form.league, matchTimestamp, externalId],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed.");
    }
  }

  // Watch for success
  if (isSuccess && !successMsg) {
    setSuccessMsg(`✅ Market "${form.homeTeam} vs ${form.awayTeam}" created successfully!`);
    setForm(EMPTY_FORM);
  }

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{
          width: "100%", maxWidth: "400px",
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--r-2xl)",
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-float)",
        }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "var(--orange)", margin: "0 auto 1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", boxShadow: "0 8px 24px rgba(255,107,0,0.35)",
            }}>🔐</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-primary)" }}>Admin Panel</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              90-Prediction Market Admin
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {loginError && (
              <div style={{
                padding: "0.625rem 0.875rem", borderRadius: "var(--r-md)",
                background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)",
                color: "#ef4444", fontSize: "0.8rem", fontWeight: 600,
              }}>
                {loginError}
              </div>
            )}

            <button type="submit" style={btnPrimaryStyle}>
              Sign In →
            </button>
          </form>

          <button onClick={() => navigate("/")} style={{
            width: "100%", marginTop: "1rem", background: "none", border: "none",
            color: "var(--text-tertiary)", fontSize: "0.78rem", cursor: "pointer",
          }}>
            ← Back to markets
          </button>
        </div>
      </div>
    );
  }

  // ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            ⚙️ Admin Panel
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Create and manage prediction markets
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate("/")} style={btnSecondaryStyle}>← Markets</button>
          <button onClick={() => setAuthed(false)} style={{ ...btnSecondaryStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(340px, 100%)", gap: "1.5rem", alignItems: "start" }}>
        {/* ── Create Market Form ── */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Create New Market</h2>

          {successMsg && (
            <div style={{
              padding: "0.75rem 1rem", borderRadius: "var(--r-md)", marginBottom: "1rem",
              background: "rgba(22,163,74,0.1)", border: "0.5px solid rgba(22,163,74,0.3)",
              color: "var(--green)", fontSize: "0.85rem", fontWeight: 600,
            }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: "0.75rem 1rem", borderRadius: "var(--r-md)", marginBottom: "1rem",
              background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontSize: "0.85rem", fontWeight: 600,
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Home Team / Option A *</label>
                <input
                  value={form.homeTeam}
                  onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
                  placeholder="e.g. Argentina"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Away Team / Option B *</label>
                <input
                  value={form.awayTeam}
                  onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
                  placeholder="e.g. France"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>League / Category *</label>
              <input
                value={form.league}
                onChange={(e) => setForm({ ...form, league: e.target.value })}
                placeholder="e.g. FIFA World Cup"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Question / Description</label>
              <input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. Will Argentina make it to Round of 16?"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Match Date *</label>
                <input
                  type="date"
                  value={form.matchDate}
                  onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Match Time</label>
                <input
                  type="time"
                  value={form.matchTime}
                  onChange={(e) => setForm({ ...form, matchTime: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>External Match ID</label>
              <input
                value={form.externalMatchId}
                onChange={(e) => setForm({ ...form, externalMatchId: e.target.value })}
                placeholder={`match_${Date.now()}`}
                style={inputStyle}
              />
              <p style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Leave blank to auto-generate
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending || isConfirming}
              style={{
                ...btnPrimaryStyle,
                opacity: isPending || isConfirming ? 0.6 : 1,
                cursor: isPending || isConfirming ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "Creating market…" : "🚀 Create Market"}
            </button>
          </form>
        </div>

        {/* ── Preset Templates ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {PRESETS.map((group) => (
            <div key={group.category} style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, fontSize: "0.78rem" }}>{group.category}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.markets.map((preset) => (
                  <button
                    key={preset.question}
                    onClick={() => applyPreset(preset)}
                    style={{
                      padding: "0.6rem 0.875rem",
                      borderRadius: "var(--r-md)",
                      border: "0.5px solid var(--border)",
                      background: "var(--bg-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem", fontWeight: 500,
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--orange)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--orange)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                    }}
                  >
                    {preset.question}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Tips */}
          <div style={{
            ...cardStyle,
            background: "var(--orange-light)",
            border: "0.5px solid var(--border-orange)",
          }}>
            <h3 style={{ ...sectionTitleStyle, color: "var(--orange)" }}>💡 Tips</h3>
            <ul style={{ fontSize: "0.75rem", color: "var(--text-secondary)", paddingLeft: "1rem", margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              <li>Click a preset to auto-fill the form</li>
              <li>You can edit any field after applying a preset</li>
              <li>Make sure your wallet is connected on XLayer Testnet</li>
              <li>Each market creation is an on-chain transaction</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid var(--border)",
  borderRadius: "var(--r-xl)",
  padding: "1.5rem",
  boxShadow: "var(--shadow-card)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.85rem", fontWeight: 800,
  color: "var(--text-primary)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 700,
  color: "var(--text-secondary)", marginBottom: "5px",
  textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.875rem",
  borderRadius: "var(--r-md)",
  border: "0.5px solid var(--border)",
  background: "var(--bg-subtle)",
  color: "var(--text-primary)",
  fontSize: "0.875rem", fontWeight: 500,
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const btnPrimaryStyle: React.CSSProperties = {
  width: "100%", padding: "0.875rem",
  borderRadius: "var(--r-md)", border: "none",
  background: "var(--orange)", color: "#fff",
  fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
  boxShadow: "0 4px 20px rgba(255,107,0,0.3)",
  transition: "box-shadow 0.15s",
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "0.4rem 0.875rem",
  borderRadius: "var(--r-md)",
  border: "0.5px solid var(--border)",
  background: "var(--bg-glass)",
  color: "var(--text-secondary)",
  fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
};
