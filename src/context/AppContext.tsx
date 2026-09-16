import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDb } from '../db/database';
import { getSettings } from '../db/repos';

type Ctx = {
  ready: boolean;
  tick: number;
  refresh: () => void;
  settings: Record<string, string>;
  reloadSettings: () => Promise<void>;
};

const C = createContext<Ctx>({ ready: false, tick: 0, refresh: () => {}, settings: {}, reloadSettings: async () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      await getDb();
      setSettings(await getSettings());
      setReady(true);
    })();
  }, []);

  return (
    <C.Provider
      value={{
        ready,
        tick,
        refresh: () => setTick((t) => t + 1),
        settings,
        reloadSettings: async () => setSettings(await getSettings()),
      }}
    >
      {children}
    </C.Provider>
  );
}

export const useApp = () => useContext(C);
