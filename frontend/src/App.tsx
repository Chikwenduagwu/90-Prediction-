/**
 * App.tsx — Root app with Privy auth, wagmi, React Query, routing
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { wagmiConfig, xLayerTestnet, xLayerMainnet } from "@/lib/wagmiConfig";
import { ToastProvider } from "@/components/ToastProvider";
import { Navbar } from "@/components/Navbar";
import { Home } from "@/pages/Home";
import { Match } from "@/pages/Match";
import { Portfolio } from "@/pages/Portfolio";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 2,
    },
  },
});

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID ?? "";
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 195);

export default function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Social login methods — no seed phrases exposed to users
        loginMethods: ["email", "google", "twitter", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#1e9e75",
          logo: "https://your-logo-url.com/logo.png",
        },
        // Embedded wallets: Privy creates and manages wallet silently
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          noPromptOnSignature: false,
        },
        defaultChain: CHAIN_ID === 196 ? xLayerMainnet : xLayerTestnet,
        supportedChains: [xLayerTestnet, xLayerMainnet],
        // Fund wallet with USDC via Privy onramp
        fundingMethodConfig: {
          moonpay: { useSandbox: CHAIN_ID !== 196 },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ToastProvider>
            <BrowserRouter>
              <div style={{
                minHeight: "100vh",
                background: "var(--color-background-tertiary)",
              }}>
                <Navbar />
                <Routes>
                  <Route path="/"           element={<Home />}    />
                  <Route path="/match/:id"  element={<Match />}   />
                  <Route path="/portfolio"  element={<Portfolio />} />
                  <Route path="*"           element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </ToastProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>⚽</p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 0.5rem" }}>
        404 — Page not found
      </h1>
      <a href="/" style={{ color: "#1e9e75", textDecoration: "none", fontWeight: 500 }}>
        Back to markets →
      </a>
    </div>
  );
}
