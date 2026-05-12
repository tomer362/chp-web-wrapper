import { comparePrices, searchProducts, type AddressResult } from "../api/client";
import type { SupermarketType } from "../context/UserSettingsContext";

const PRELOAD_PRODUCTS = ["חלב", "לחם", "ביצים", "קוטג", "עגבניות"];

export function locationKey(address: AddressResult) {
  return `${address.city_id}_${address.street_id}`;
}

export async function preloadSupermarketsForAddress(address: AddressResult) {
  const found: Record<SupermarketType, Set<string>> = {
    online: new Set(),
    physical: new Set(),
  };

  for (const term of PRELOAD_PRODUCTS) {
    const products = await searchProducts(term, address.city_id, address.street_id);
    const product = products.find((item) => item.barcode);
    if (!product) continue;

    try {
      const result = await comparePrices(product.barcode, product.value || product.label, address.city_id, address.street_id, "50");
      result.online_stores.forEach((store) => store.chain && found.online.add(store.chain));
      result.physical_stores.forEach((store) => store.chain && found.physical.add(store.chain));
    } catch {
      // CHP may miss a sampled product; keep loading chains from the rest.
    }
  }

  return {
    online: [...found.online],
    physical: [...found.physical],
  };
}
