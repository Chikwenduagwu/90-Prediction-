import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { EXPLORER_URL } from "@/lib/wagmiConfig";

export type ToastType = "success" | "error" | "info" | "warning";
export interface Toast { id: string; type: ToastType; message: string; txHash?: `0x${string}`; duration?: number; }
interface ToastCtx { toasts: Toast[]; addToast: (t: Omit<Toast, "id">) => string; removeToast: (id: string) => void; clearAll: () => void; }

const ToastContext = createContext<ToastCtx | null>(null);
export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">): string => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const dur = toast.duration ?? 5000;
    setToasts((p) => [...p.slice(-4), { ...toast, id }]);
    timers.current.set(id, setTimeout(() => removeToast(id), dur));
    return id;
  }, [removeToast]);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <div aria-live="polite" role="region" style={{
        position: "fixed", bottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))",
        right: "1rem", zIndex: 9999,
        display: "flex", flexDirection: "column", gap: "8px",
        width: "min(360px, calc(100vw - 2rem))", pointerEvents: "none",
      }}>
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, { icon: string; accent: string }> = {
  success: { icon: "✓", accent: "var(--green)"  },
  error:   { icon: "✕", accent: "var(--red)"    },
  info:    { icon: "ℹ", accent: "var(--blue)"   },
  warning: { icon: "⚠", accent: "var(--amber)"  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { icon, accent } = STYLES[toast.type];
  return (
    <div role="alert" style={{
      pointerEvents: "all",
      background: "rgba(255,255,255,0.94)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `0.5px solid var(--border)`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: "var(--r-lg)",
      padding: "0.875rem 1rem",
      display: "flex", alignItems: "flex-start", gap: "0.625rem",
      boxShadow: "var(--shadow-float)",
      animation: "toastSlideIn 0.22s ease",
    }}>
      <span style={{ fontSize: "0.9rem", color: accent, flexShrink: 0, marginTop: "1px", fontWeight: 700 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {toast.message}
        </p>
        {toast.txHash && (
          <a href={`${EXPLORER_URL}/tx/${toast.txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.72rem", color: "var(--orange)", textDecoration: "none", marginTop: "3px", display: "inline-block", fontWeight: 600 }}>
            View tx →
          </a>
        )}
      </div>
      <button onClick={() => onRemove(toast.id)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-tertiary)", fontSize: "1rem", padding: "0",
        lineHeight: 1, flexShrink: 0, marginTop: "1px",
      }}>×</button>
    </div>
  );
}
