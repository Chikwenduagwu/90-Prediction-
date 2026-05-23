/**
 * CountdownTimer.tsx — Live countdown to match kickoff / betting close
 * Accent styling activates when < 30 minutes remain
 */

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetTimestamp: bigint;  // Unix seconds
  label?: string;
  className?: string;
  onExpired?: () => void;
}

interface TimeLeft {
  days:    number;
  hours:   number;
  minutes: number;
  seconds: number;
  total:   number;  // seconds remaining
}

function getTimeLeft(targetUnix: bigint): TimeLeft {
  const nowSecs = Math.floor(Date.now() / 1000);
  const total   = Math.max(0, Number(targetUnix) - nowSecs);

  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({
  targetTimestamp,
  label = "Closes in",
  onExpired,
}: CountdownTimerProps) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(targetTimestamp));

  useEffect(() => {
    if (time.total <= 0) {
      onExpired?.();
      return;
    }

    const id = setInterval(() => {
      const next = getTimeLeft(targetTimestamp);
      setTime(next);
      if (next.total <= 0) {
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [targetTimestamp, onExpired, time.total]);

  if (time.total <= 0) {
    return (
      <span style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--color-text-danger)",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}>
        Closed
      </span>
    );
  }

  const isUrgent = time.total < 30 * 60;   // &lt; 30 minutes
  const isVeryUrgent = time.total < 5 * 60; // &lt; 5 minutes

  const color = isVeryUrgent
    ? "var(--color-text-danger)"
    : isUrgent
    ? "var(--color-text-warning)"
    : "var(--color-text-secondary)";

  const showDays = time.days > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{
        fontSize: "0.7rem",
        fontWeight: 500,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {label}
      </span>

      <span
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: isUrgent ? "0.95rem" : "0.85rem",
          fontWeight: isUrgent ? 700 : 500,
          color,
          letterSpacing: "0.02em",
          transition: "color 0.3s ease",
          ...(isVeryUrgent ? { animation: "pulse 1s ease-in-out infinite" } : {}),
        }}
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${label} ${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`}
      >
        {showDays && `${time.days}d `}
        {(showDays || time.hours > 0) && `${pad(time.hours)}:`}
        {pad(time.minutes)}:{pad(time.seconds)}
      </span>

      {isUrgent && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: isVeryUrgent ? "var(--color-text-danger)" : "var(--color-text-warning)",
            animation: "pulse 1s ease-in-out infinite",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
