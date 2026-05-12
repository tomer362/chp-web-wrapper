import { createContext, useContext, useState, type ReactNode } from "react";
import type { AddressResult } from "../api/client";

interface UserLocationContextType {
  address: AddressResult | null;
  setAddress: (address: AddressResult | null) => void;
}

const Ctx = createContext<UserLocationContextType | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<AddressResult | null>(null);

  return <Ctx.Provider value={{ address, setAddress }}>{children}</Ctx.Provider>;
}

export function useUserLocation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUserLocation must be inside UserLocationProvider");
  return c;
}
