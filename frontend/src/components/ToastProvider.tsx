/**
 * ToastProvider.tsx — Full toast notification system
 * Supports: success, error, info, warning
 * Auto-dismisses after 5s; manual close; tx hash links
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { EXPLORER_URL } from "@/lib/wagmiConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  txHash?: `0x${string}`;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = toast.duration ?? 5000;

      setToasts((prev) => {
        // Keep max 5 toasts
        const pruned = prev.length >= 5 ? prev.slice(-4) : prev;
        return [...pruned, { ...toast, id }];
      });

      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "380px",
        width: "100%",
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Toast Item ───────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
  success: {
    bg: "var(--color-background-success)",
    border: "var(--color-border-success)",
    icon: "⚽",
    color: "var(--color-text-success)",
  },
  error: {
    bg: "var(--color-background-danger)",
    border: "var(--color-border-danger)",
    icon: "✕",
    color: "var(--color-text-danger)",
  },
  info: {
    bg: "var(--color-background-info)",
    border: "var(--color-border-info)",
    icon: "ℹ",
    color: "var(--color-text-info)",
  },
  warning: {
    bg: "var(--color-background-warning)",
    border: "var(--color-border-warning)",
    icon: "⚠",
    color: "var(--color-text-warning)",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const style = TOAST_STYLES[toast.type];

  return (
    <div
      role="alert"
      style={{
        pointerEvents: "all",
        background: "var(--color-background-primary)",
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.color}`,
        borderRadius: "10px",
        padding: "0.875rem 1rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        animation: "toastSlideIn 0.2s ease",
      }}
    >
      <span style={{ fontSize: "1rem", color: style.color, flexShrink: 0, marginTop: "1px" }}>
        {style.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--color-text-primary)",
          lineHeight: 1.4,
        }}>
          {toast.message}
        </p>
        {toast.txHash && (
          <a
            href={`${EXPLORER_URL}/tx/${toast.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.75rem",
              color: style.color,
              textDecoration: "underline",
              marginTop: "4px",
              display: "inline-block",
            }}
          >
            View on explorer →
          </a>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-tertiary)",
          fontSize: "1rem",
          padding: "0",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: "1px",
        }}
      >
        ×
      </button>
    </div>
  );
}
