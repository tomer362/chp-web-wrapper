import { useEffect, useRef } from "react";
import { useUserLocation } from "../context/UserLocationContext";
import { useUserSettings } from "../context/UserSettingsContext";
import { locationKey, preloadSupermarketsForAddress } from "../utils/supermarketPreload";

export function BackgroundSupermarketPreloader() {
  const { address } = useUserLocation();
  const settings = useUserSettings();
  const loadingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const key = locationKey(address);
    if (settings.lastLoadedLocationKey === key || loadingKeyRef.current === key) return;

    loadingKeyRef.current = key;
    const timeoutId = window.setTimeout(() => {
      preloadSupermarketsForAddress(address)
        .then((found) => {
          settings.upsertSupermarkets("online", found.online);
          settings.upsertSupermarkets("physical", found.physical);
          settings.markLoaded(key);
        })
        .catch(() => {
          // Background discovery is opportunistic; settings page still offers manual refresh.
        })
        .finally(() => {
          loadingKeyRef.current = null;
        });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [address, settings]);

  return null;
}
