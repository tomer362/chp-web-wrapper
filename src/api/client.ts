export interface AddressResult {
  label: string;
  value: string;
  city_id: string;
  street_id: string;
}

export interface ProductResult {
  label: string;
  value: string;
  barcode: string;
  parts?: {
    name_and_contents?: string;
    manufacturer_and_barcode?: string;
    pack_size?: string;
    small_image?: string;
    chainnames?: string;
    price_range?: [string, string];
  };
}

export interface StoreOffer {
  chain: string;
  store_name: string;
  address?: string;
  website_url?: string;
  deal: string;
  price: number;
}

export interface CompareResult {
  product_name: string;
  product_code: string;
  physical_stores: StoreOffer[];
  online_stores: StoreOffer[];
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${path}?${qs}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function searchAddress(q: string, from = "0"): Promise<AddressResult[]> {
  return get("/api/addresses", { q, from });
}

export function searchProducts(q: string, city_id = "0", street_id = "0", from = "0"): Promise<ProductResult[]> {
  return get("/api/products", { q, city_id, street_id, from });
}

export function comparePrices(
  barcode: string,
  product_name: string,
  city_id = "0",
  street_id = "0",
  num_results = "20"
): Promise<CompareResult> {
  return get("/api/compare", { barcode, product_name, city_id, street_id, num_results });
}
