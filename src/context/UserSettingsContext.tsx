import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreOffer } from "../api/client";

export type SupermarketType = "online" | "physical";

export interface SupermarketPreference {
  chain: string;
  enabled: boolean;
}

interface StoredSettings {
  supermarkets: Record<SupermarketType, SupermarketPreference[]>;
  lastLoadedAt?: number;
}

interface UserSettingsContextType extends StoredSettings {
  upsertSupermarkets: (type: SupermarketType, chains: string[]) => void;
  setSupermarketEnabled: (type: SupermarketType, chain: string, enabled: boolean) => void;
  setAllSupermarketsEnabled: (type: SupermarketType, enabled: boolean) => void;
  markLoaded: () => void;
  isStoreEnabled: (type: SupermarketType, store: StoreOffer) => boolean;
}

const STORAGE_KEY = "super-compare-user-settings";
const EMPTY_SETTINGS: StoredSettings = {
  supermarkets: {
    online: [],
    physical: [],
  },
};

function normalizeChain(chain: string) {
  return chain
    .normalize("NFKC")
    .replace(/[\u200b\u200c\u200d\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function load(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      supermarkets: {
        online: parsed.supermarkets?.online ?? [],
        physical: parsed.supermarkets?.physical ?? [],
      },
      lastLoadedAt: parsed.lastLoadedAt,
    };
  } catch {
    return EMPTY_SETTINGS;
  }
}

const Ctx = createContext<UserSettingsContextType | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<UserSettingsContextType>(() => {
    const upsertSupermarkets = (type: SupermarketType, chains: string[]) => {
      setSettings((prev) => {
        const existing = new Map(prev.supermarkets[type].map((item) => [normalizeChain(item.chain), item]));
        chains.map(normalizeChain).filter(Boolean).forEach((chain) => {
          if (!existing.has(chain)) existing.set(chain, { chain, enabled: true });
        });

        return {
          ...prev,
          supermarkets: {
            ...prev.supermarkets,
            [type]: [...existing.values()].sort((a, b) => a.chain.localeCompare(b.chain, "he")),
          },
        };
      });
    };

    const setSupermarketEnabled = (type: SupermarketType, chain: string, enabled: boolean) => {
      const normalized = normalizeChain(chain);
      setSettings((prev) => ({
        ...prev,
        supermarkets: {
          ...prev.supermarkets,
          [type]: prev.supermarkets[type].some((item) => normalizeChain(item.chain) === normalized)
            ? prev.supermarkets[type].map((item) =>
                normalizeChain(item.chain) === normalized ? { ...item, enabled } : item
              )
            : [...prev.supermarkets[type], { chain: normalized, enabled }].sort((a, b) => a.chain.localeCompare(b.chain, "he")),
        },
      }));
    };

    const setAllSupermarketsEnabled = (type: SupermarketType, enabled: boolean) => {
      setSettings((prev) => ({
        ...prev,
        supermarkets: {
          ...prev.supermarkets,
          [type]: prev.supermarkets[type].map((item) => ({ ...item, enabled })),
        },
      }));
    };

    const markLoaded = () => {
      setSettings((prev) => ({ ...prev, lastLoadedAt: Date.now() }));
    };

    const isStoreEnabled = (type: SupermarketType, store: StoreOffer) => {
      const chain = normalizeChain(store.chain);
      const preference = settings.supermarkets[type].find((item) => normalizeChain(item.chain) === chain);
      return preference?.enabled ?? true;
    };

    return {
      ...settings,
      upsertSupermarkets,
      setSupermarketEnabled,
      setAllSupermarketsEnabled,
      markLoaded,
      isStoreEnabled,
    };
  }, [settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUserSettings must be inside UserSettingsProvider");
  return c;
}
