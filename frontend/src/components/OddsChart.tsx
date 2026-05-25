import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import { useWatchContractEvent } from "wagmi";
import { CONTRACT_ADDRESS } from "@/lib/wagmiConfig";
import { PREDICTION_MARKET_ABI } from "@/lib/contractAbi";
import type { Market } from "@/hooks/useMarkets";

interface OddsPoint { t: string; home: number; away: number; draw: number; }

export function OddsChart({ market }: { market: Market }) {
  const [points, setPoints] = useState<OddsPoint[]>([{
    t: "Start",
    home: Math.round(market.probHome * 100),
    away: Math.round(market.probAway * 100),
    draw: Math.round(market.probDraw * 100),
  }]);

  const lastRef = useRef({ home: market.probHome, away: market.probAway });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "BetPlaced",
    onLogs: (logs) => {
      const rel = logs.filter((l) => l.args.marketId === market.id);
      if (!rel.length) return;
      const last = rel[rel.length - 1];
      const h = Number(last.args.newOddsHome as bigint) / 1_000_000;
      const a = Number(last.args.newOddsAway as bigint) / 1_000_000;
      const d = Number(last.args.newOddsDraw as bigint) / 1_000_000;
      if (Math.abs(h - lastRef.current.home) < 0.004) return;
      lastRef.current = { home: h, away: a };
      const t = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
      setPoints((p) => [...p.slice(-49), { t, home: Math.round(h*100), away: Math.round(a*100), draw: Math.round(d*100) }]);
    },
  });

  useEffect(() => {
    const h = Math.round(market.probHome * 100);
    const a = Math.round(market.probAway * 100);
    const d = Math.round(market.probDraw * 100);
    setPoints((p) => {
      const last = p[p.length - 1];
      if (last?.home === h && last?.away === a) return p;
      const t = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
      return [...p.slice(-49), { t, home: h, away: a, draw: d }];
    });
  }, [market.probHome, market.probAway, market.probDraw]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        border: "0.5px solid var(--border)", borderRadius: "var(--r-md)",
        padding: "0.625rem 0.875rem", fontSize: "0.78rem", boxShadow: "var(--shadow-float)",
      }}>
        <p style={{ color: "var(--text-tertiary)", marginBottom: "4px", fontSize: "0.7rem" }}>{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color, fontWeight: 700, margin: "2px 0" }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  };

  const legends = [
    { key: "home", label: market.homeTeam, color: "var(--orange)" },
    { key: "draw", label: "Draw",          color: "var(--text-tertiary)" },
    { key: "away", label: market.awayTeam, color: "var(--black)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Live Odds
        </span>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {legends.map((l) => (
            <span key={l.key} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              <span style={{ width: "12px", height: "3px", borderRadius: "2px", background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={points} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={33} stroke="var(--border)" strokeDasharray="2 4" />
          <Line type="monotone" dataKey="home" name={market.homeTeam} stroke="var(--orange)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "var(--orange)" }} />
          <Line type="monotone" dataKey="draw" name="Draw" stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="away" name={market.awayTeam} stroke="var(--black)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "var(--black)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
