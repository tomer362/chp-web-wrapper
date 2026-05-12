import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AddressResult } from "../api/client";

interface UserLocationContextType {
  address: AddressResult | null;
  setAddress: (address: AddressResult | null) => void;
}

const Ctx = createContext<UserLocationContextType | null>(null);
const STORAGE_KEY = "super-compare-user-location";

function load(): AddressResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<AddressResult | null>(load);

  useEffect(() => {
    if (address) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [address]);

  return <Ctx.Provider value={{ address, setAddress }}>{children}</Ctx.Provider>;
}

export function useUserLocation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUserLocation must be inside UserLocationProvider");
  return c;
}
