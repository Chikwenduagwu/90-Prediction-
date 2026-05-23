/**
 * Navbar.tsx — Top navigation bar
 * Shows logo, nav links, wallet connect (Privy), USDC balance
 */

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

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 400,
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    textDecoration: "none",
    padding: "0.35rem 0.75rem",
    borderRadius: "8px",
    background: active ? "var(--color-background-secondary)" : "transparent",
    transition: "all 0.15s ease",
  });

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "var(--color-background-primary)",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      backdropFilter: "blur(8px)",
    }}>
      <nav style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 1.5rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
      }}>
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>⚽</span>
          <span style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}>
            GoalMarket
          </span>
          <span style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            background: "#1e9e75",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            LIVE
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1 }}>
          <Link to="/" style={navLinkStyle(isActive("/"))}>Markets</Link>
          <Link to="/portfolio" style={navLinkStyle(isActive("/portfolio"))}>Portfolio</Link>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {authenticated && address && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.3rem 0.75rem",
              background: "var(--color-background-secondary)",
              borderRadius: "8px",
              border: "0.5px solid var(--color-border-tertiary)",
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                USDC
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {formatUsdc(balance)}
              </span>
            </div>
          )}

          {authenticated ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)",
                fontFamily: "monospace",
              }}>
                {address
                  ? `${address.slice(0, 6)}…${address.slice(-4)}`
                  : user?.email?.address?.split("@")[0]}
              </span>
              <button
                onClick={() => void logout()}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "8px",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "none",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => void login()}
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                padding: "0.45rem 1.1rem",
                borderRadius: "8px",
                border: "none",
                background: "#1e9e75",
                color: "#fff",
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
            >
              Connect wallet
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
