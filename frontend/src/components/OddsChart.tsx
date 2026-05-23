/**
 * OddsChart.tsx — Recharts line chart showing live LMSR odds over time
 * Subscribes to BetPlaced events and appends new data points
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import { useWatchContractEvent } from "wagmi";
import { CONTRACT_ADDRESS } from "@/lib/wagmiConfig";
import { PREDICTION_MARKET_ABI } from "@/lib/contractAbi";
import type { Market } from "@/hooks/useMarkets";

interface OddsPoint {
  t: string;             // formatted time
  home: number;
  away: number;
  draw: number;
}

interface OddsChartProps {
  market: Market;
}

function toPercent(prob: number) {
  return Math.round(prob * 100);
}

export function OddsChart({ market }: OddsChartProps) {
  const [points, setPoints] = useState<OddsPoint[]>(() => {
    // Seed with initial state
    return [
      {
        t: "Start",
        home: toPercent(market.probHome),
        away: toPercent(market.probAway),
        draw: toPercent(market.probDraw),
      },
    ];
  });

  const lastRef = useRef({ home: market.probHome, away: market.probAway, draw: market.probDraw });

  // Watch for new bets on this market and update odds
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "BetPlaced",
    onLogs: (logs) => {
      const relevant = logs.filter((l) => l.args.marketId === market.id);
      if (relevant.length === 0) return;

      const last = relevant[relevant.length - 1];
      const h = Number(last.args.newOddsHome as bigint) / 1_000_000;
      const a = Number(last.args.newOddsAway as bigint) / 1_000_000;
      const d = Number(last.args.newOddsDraw as bigint) / 1_000_000;

      // Only add if meaningfully changed
      const prev = lastRef.current;
      if (Math.abs(h - prev.home) < 0.005 && Math.abs(a - prev.away) < 0.005) return;

      lastRef.current = { home: h, away: a, draw: d };

      const now = new Date();
      const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

      setPoints((prev) => [
        ...prev.slice(-49), // keep last 50 points
        { t, home: toPercent(h), away: toPercent(a), draw: toPercent(d) },
      ]);
    },
  });

  // Also sync when market prop changes (e.g. on initial load)
  useEffect(() => {
    const h = toPercent(market.probHome);
    const a = toPercent(market.probAway);
    const d = toPercent(market.probDraw);

    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.home === h && last.away === a) return prev;
      const t = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
      return [...prev.slice(-49), { t, home: h, away: a, draw: d }];
    });
  }, [market.probHome, market.probAway, market.probDraw]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "8px",
        padding: "0.6rem 0.8rem",
        fontSize: "0.8rem",
      }}>
        <p style={{ margin: "0 0 4px", color: "var(--color-text-tertiary)", fontSize: "0.7rem" }}>{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ margin: "2px 0", color: p.color, fontWeight: 500 }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Live odds
        </span>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: market.homeTeam, color: "#1e9e75" },
            { label: "Draw",         color: "#888780" },
            { label: market.awayTeam, color: "#3266ad" },
          ].map((item) => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              <span style={{ width: "10px", height: "3px", borderRadius: "2px", background: item.color, display: "inline-block" }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={33} stroke="var(--color-border-tertiary)" strokeDasharray="2 4" />
          <Line
            type="monotone"
            dataKey="home"
            name={market.homeTeam}
            stroke="#1e9e75"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="draw"
            name="Draw"
            stroke="#888780"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            strokeDasharray="4 2"
          />
          <Line
            type="monotone"
            dataKey="away"
            name={market.awayTeam}
            stroke="#3266ad"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
