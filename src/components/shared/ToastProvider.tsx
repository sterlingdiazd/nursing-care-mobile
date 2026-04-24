import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Toast, ToastVariant } from "./Toast";

interface ToastOptions {
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastEntry extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastEntry | null>(null);
  const queue = useRef<ToastEntry[]>([]);
  const counter = useRef(0);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    setCurrent(next ?? null);
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    // Small tick to allow state to settle before showing next
    setTimeout(showNext, 50);
  }, [showNext]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      counter.current += 1;
      const entry: ToastEntry = { ...options, id: counter.current };

      if (current === null) {
        setCurrent(entry);
      } else {
        queue.current.push(entry);
      }
    },
    [current]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current !== null && (
        <Toast
          key={current.id}
          variant={current.variant}
          message={current.message}
          duration={current.duration}
          onDismiss={handleDismiss}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
