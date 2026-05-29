/**
 * App.tsx — Root app with Privy auth, wagmi, React Query, routing
 *
 * Fix: ErrorBoundary wraps everything so a provider crash shows a helpful
 * message instead of a blank screen.
 * Fix: PrivyProvider is the outermost provider (required by Privy v1.80+).
 * Fix: WagmiProvider is fed wagmiConfig from inside Privy's context.
 */

import React, { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { wagmiConfig, xLayerTestnet, xLayerMainnet } from "@/lib/wagmiConfig";
import { ToastProvider } from "@/components/ToastProvider";
import { Navbar } from "@/components/Navbar";
import { Home } from "@/pages/Home";
import { Match } from "@/pages/Match";
import { Admin } from "@/pages/Admin";
import { Faucet } from "@/pages/Faucet";
import { Portfolio } from "@/pages/Portfolio";

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: unknown): EBState {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column", gap: "1rem",
          fontFamily: "sans-serif", padding: "2rem", textAlign: "center",
        }}>
          <span style={{ fontSize: "3rem" }}>⚽</span>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#5f5e5a", maxWidth: "480px", margin: 0, fontSize: "0.875rem" }}>
            {this.state.message || "An unexpected error occurred. Check your environment variables."}
          </p>
          <p style={{ color: "#888780", fontSize: "0.8rem", margin: 0 }}>
            Make sure <code>VITE_PRIVY_APP_ID</code>, <code>VITE_CONTRACT_ADDRESS</code> and <code>VITE_USDC_ADDRESS</code> are set in Vercel.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem", padding: "0.5rem 1.5rem", borderRadius: "8px",
              border: "none", background: "#1e9e75", color: "#fff",
              cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// ─── Env vars ─────────────────────────────────────────────────────────────────

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID ?? "";
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 195);
const IS_MAINNET = CHAIN_ID === 196;

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Guard: if Privy app ID is missing, render a helpful setup page instead of crashing
  if (!PRIVY_APP_ID) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: "1rem",
        fontFamily: "sans-serif", padding: "2rem", textAlign: "center",
        background: "#f0ede8",
      }}>
        <span style={{ fontSize: "3rem" }}>⚽</span>
        <h1 style={{ fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>GoalMarket Setup Required</h1>
        <p style={{ color: "#5f5e5a", maxWidth: "520px", margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
          Missing environment variable <code style={{ background: "#e8e6e0", padding: "2px 6px", borderRadius: "4px" }}>VITE_PRIVY_APP_ID</code>.
          Add it in your Vercel project settings under <strong>Environment Variables</strong>.
        </p>
        <div style={{
          background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: "12px",
          padding: "1rem 1.5rem", maxWidth: "480px", textAlign: "left", fontSize: "0.82rem",
          lineHeight: 1.8, color: "#444",
        }}>
          <strong>Required env vars:</strong><br />
          <code>VITE_PRIVY_APP_ID</code> — from <a href="https://console.privy.io" style={{ color: "#1e9e75" }}>console.privy.io</a><br />
          <code>VITE_CONTRACT_ADDRESS</code> — deployed contract<br />
          <code>VITE_USDC_ADDRESS</code> — USDC / MockUSDC<br />
          <code>VITE_CHAIN_ID</code> — 195 (testnet) or 196 (mainnet)<br />
          <code>VITE_FOOTBALL_DATA_API_KEY</code> — from football-data.org
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ["email", "google", "twitter", "wallet"],
          appearance: {
            theme: "light",
            accentColor: "#1e9e75",
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
            noPromptOnSignature: false,
          },
          defaultChain: IS_MAINNET ? xLayerMainnet : xLayerTestnet,
          supportedChains: [xLayerTestnet, xLayerMainnet],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <ToastProvider>
              <BrowserRouter>
                <ErrorBoundary>
                  <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
                    <Navbar />
                    <Routes>
                      <Route path="/"          element={<Home />}      />
                      <Route path="/match/:id" element={<Match />}     />
                      <Route path="/admin" element={<Admin />} />
          <Route path="/faucet" element={<Faucet />} />
          <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="*"          element={<NotFound />}  />
                    </Routes>
                  </div>
                </ErrorBoundary>
              </BrowserRouter>
            </ToastProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>⚽</p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
        404 — Page not found
      </h1>
      <a href="/" style={{ color: "#1e9e75", textDecoration: "none", fontWeight: 500 }}>
        Back to markets →
      </a>
    </div>
  );
}
