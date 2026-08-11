import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  error: { icon: AlertCircle, iconClass: 'text-red-600 dark:text-red-400' },
  success: { icon: CheckCircle2, iconClass: 'text-green-600 dark:text-green-400' },
  info: { icon: Info, iconClass: 'text-purple-600 dark:text-purple-400' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'error') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      error: (message) => push(message, 'error'),
      success: (message) => push(message, 'success'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const { icon: Icon, iconClass } = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className="toast-in pointer-events-auto flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-2xl dark:bg-slate-900 dark:border-slate-700"
              role="status"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
              <p className="flex-1 text-sm text-slate-800 leading-snug dark:text-slate-200">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-500 hover:text-slate-900 transition-colors p-0.5 dark:hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}