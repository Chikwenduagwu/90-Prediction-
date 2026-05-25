import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetTimestamp: bigint;
  label?: string;
  onExpired?: () => void;
}

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; total: number; }

function getTimeLeft(ts: bigint): TimeLeft {
  const total = Math.max(0, Number(ts) - Math.floor(Date.now() / 1000));
  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CountdownTimer({ targetTimestamp, label = "Closes in", onExpired }: CountdownTimerProps) {
  const [time, setTime] = useState(() => getTimeLeft(targetTimestamp));

  useEffect(() => {
    if (time.total <= 0) { onExpired?.(); return; }
    const id = setInterval(() => {
      const next = getTimeLeft(targetTimestamp);
      setTime(next);
      if (next.total <= 0) { clearInterval(id); onExpired?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp, onExpired, time.total]);

  if (time.total <= 0) return (
    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      Closed
    </span>
  );

  const urgent     = time.total < 30 * 60;
  const veryUrgent = time.total < 5 * 60;

  const color = veryUrgent ? "var(--red)" : urgent ? "var(--orange)" : "var(--text-tertiary)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      {label && (
        <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
      <span style={{
        fontFamily: "monospace", fontSize: urgent ? "0.88rem" : "0.8rem",
        fontWeight: urgent ? 800 : 500, color,
        animation: veryUrgent ? "pulse 1s ease-in-out infinite" : "none",
      }}>
        {time.days > 0 && `${time.days}d `}
        {(time.days > 0 || time.hours > 0) && `${pad(time.hours)}:`}
        {pad(time.minutes)}:{pad(time.seconds)}
      </span>
      {urgent && (
        <span style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: color, display: "inline-block",
          animation: "pulse 1s ease-in-out infinite", flexShrink: 0,
        }} />
      )}
    </span>
  );
}
