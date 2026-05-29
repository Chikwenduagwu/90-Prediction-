import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useUsdcBalance } from "@/hooks/useBet";
import { formatUsdc } from "@/lib/lmsr";

export function Navbar() {
  const { login, logout, authenticated, user } = usePrivy();
  const { address } = useAccount();
  const { balance } = useUsdcBalance(address);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: "0.9rem",
    fontWeight: active ? 700 : 500,
    color: active ? "var(--orange)" : "var(--text-primary)",
    textDecoration: "none",
    padding: "0.45rem 0.875rem",
    borderRadius: "var(--r-md)",
    background: active ? "var(--orange-light)" : "transparent",
    border: active ? "1px solid var(--border-orange)" : "1px solid transparent",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap" as const,
  });

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "var(--bg-glass)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderBottom: "0.5px solid var(--border)",
      boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
    }}>
      <nav style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 1rem",
        height: "58px",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", flexShrink: 0 }}>
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⚽</span>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
            Goal<span style={{ color: "var(--orange)" }}>Market</span>
          </span>
          <span style={{
            fontSize: "0.55rem", fontWeight: 700, background: "var(--orange)",
            color: "#fff", padding: "2px 5px", borderRadius: "4px",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>LIVE</span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}
             className="desktop-nav">
          <Link to="/" style={linkStyle(isActive("/"))}>Markets</Link>
          <Link to="/portfolio" style={linkStyle(isActive("/portfolio"))}>Portfolio</Link>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
          {authenticated && address && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.3rem 0.7rem",
              background: "var(--orange-light)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-orange)",
            }}>
              <span style={{ fontSize: "0.7rem", color: "var(--orange)", fontWeight: 700 }}>USDC</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {formatUsdc(balance)}
              </span>
            </div>
          )}

          {authenticated ? (
            <>
              {/* Address chip — hide on very small screens */}
              <span style={{
                fontSize: "0.72rem", color: "var(--text-tertiary)",
                fontFamily: "monospace", display: "none",
              }} className="addr-chip">
                {address ? `${address.slice(0, 6)}…${address.slice(-4)}`
                         : user?.email?.address?.split("@")[0]}
              </span>
              <button onClick={() => void logout()} style={{
                fontSize: "0.8rem", fontWeight: 600,
                padding: "0.4rem 0.875rem",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-mid)",
                background: "var(--bg-glass-deep)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                Sign out
              </button>
            </>
          ) : (
            <button onClick={() => void login()} style={{
              fontSize: "0.875rem", fontWeight: 700,
              padding: "0.5rem 1.1rem",
              borderRadius: "var(--r-md)",
              border: "none",
              background: "var(--black)",
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}>
              Connect
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            style={{
              display: "none", background: "none", border: "1px solid var(--border-mid)",
              borderRadius: "var(--r-md)", padding: "0.4rem 0.5rem",
              cursor: "pointer", color: "var(--text-primary)", fontSize: "1rem",
              lineHeight: 1,
            }}
            className="hamburger"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          background: "var(--bg-glass-deep)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid var(--border)",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          <a href="/faucet">🚰 Faucet</a>
          <Link to="/" onClick={() => setMenuOpen(false)} style={linkStyle(isActive("/"))}>⚽ Markets</Link>
          <Link to="/portfolio" onClick={() => setMenuOpen(false)} style={linkStyle(isActive("/portfolio"))}>📊 Portfolio</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .desktop-nav { display: none !important; }
          .hamburger   { display: flex !important; }
          .addr-chip   { display: none !important; }
        }
        @media (min-width: 601px) {
          .addr-chip { display: inline !important; }
        }
      `}</style>
    </header>
  );
}
