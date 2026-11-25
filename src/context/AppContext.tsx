import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDatabase, subscribeDbChanges } from '../services/db';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface AppContextValue {
  dbReady: boolean;
  dbError: string | null;
  dbVersion: number;
  seasonFilter: string;
  setSeasonFilter: (val: string) => void;
  triggerRefresh: () => void;
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
  confirmOptions: ConfirmOptions | null;
  requestConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbVersion, setDbVersion] = useState(0);
  const [seasonFilter, setSeasonFilter] = useState<string>('2026');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    let mounted = true;
    initDatabase()
      .then(() => {
        if (mounted) {
          setDbReady(true);
          setDbVersion((v) => v + 1);
        }
      })
      .catch((err) => {
        if (mounted) {
          setDbError(err instanceof Error ? err.message : String(err));
        }
      });

    const unsub = subscribeDbChanges(() => {
      if (mounted) {
        setDbVersion((v) => v + 1);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    setDbVersion((v) => v + 1);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastItem['type'], title: string, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  const requestConfirm = useCallback((opts: ConfirmOptions) => {
    setConfirmOptions(opts);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOptions(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        dbReady,
        dbError,
        dbVersion,
        seasonFilter,
        setSeasonFilter,
        triggerRefresh,
        toasts,
        addToast,
        dismissToast,
        confirmOptions,
        requestConfirm,
        closeConfirm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
