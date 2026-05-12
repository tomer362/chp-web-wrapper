import { useEffect, useMemo, useState } from "react";
import { useGroceryLists } from "../context/GroceryListsContext";
import { comparePrices, type CompareResult, type StoreOffer } from "../api/client";
import { Loader, AlertCircle, CheckCircle2, XCircle, Monitor, Store } from "lucide-react";

interface Props {
  listId: string | null;
  cityId: string;
  streetId: string;
  addressLabel: string;
}

interface ItemResult {
  productName: string;
  productSearchValue?: string;
  quantity: number;
  result: CompareResult | null;
  error?: string;
}

interface BasketStore {
  key: string;
  chain: string;
  storeName: string;
  address?: string;
  websiteUrl?: string;
  providedProducts: Set<string>;
  total: number;
}

interface BasketSummary extends Omit<BasketStore, "providedProducts"> {
  itemCount: number;
  missingProducts: string[];
}

type StoreType = "online" | "physical";

function storeKey(store: StoreOffer) {
  const normalizedUrl = normalizeUrl(store.website_url);
  if (normalizedUrl) return `online|${normalizedUrl}`;

  return ["physical", normalizeText(store.chain), normalizeText(store.store_name), normalizeText(store.address || "")].join("|");
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200b\u200c\u200d\u200e\u200f]/g, "")
    .replace(/[.,'\"״׳:;\-–—/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return normalizeText(value);
  }
}

function productKey(item: ItemResult, index: number) {
  return `${index}-${item.productName}`;
}

function displayLocation(store: Pick<BasketSummary, "address" | "websiteUrl">) {
  return store.address || store.websiteUrl || "—";
}

export function ListCompareTable({ listId, cityId, streetId, addressLabel }: Props) {
  const { getList } = useGroceryLists();
  const list = listId ? getList(listId) : undefined;
  const [results, setResults] = useState<ItemResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeType, setStoreType] = useState<StoreType>("online");

  useEffect(() => {
    let cancelled = false;

    async function runCompare() {
      if (!list || list.items.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const out: ItemResult[] = [];

      for (const item of list.items) {
        if (cancelled) return;

        try {
          const productSearchValue = item.productSearchValue || item.productName;
          const r = await comparePrices(item.barcode || "", productSearchValue, cityId, streetId);
          out.push({
            productName: item.productName,
            productSearchValue: item.productSearchValue,
            quantity: item.quantity,
            result: r,
          });
        } catch {
          out.push({
            productName: item.productName,
            productSearchValue: item.productSearchValue,
            quantity: item.quantity,
            result: null,
            error: "לא נמצא",
          });
        }
      }

      if (!cancelled) {
        setResults(out);
        setLoading(false);
      }
    }

    runCompare();

    return () => {
      cancelled = true;
    };
  }, [list, cityId, streetId]);

  const basketSummaries = useMemo(() => {
    const stores = new Map<string, BasketStore>();

    results.forEach((item, itemIndex) => {
      const storesForItem = item.result ? item.result[storeType === "online" ? "online_stores" : "physical_stores"] : [];
      const keyForItem = productKey(item, itemIndex);

      storesForItem.forEach((store) => {
        const key = storeKey(store);
        const existing = stores.get(key) ?? {
          key,
          chain: store.chain,
          storeName: store.store_name,
          address: store.address,
          websiteUrl: store.website_url,
          providedProducts: new Set<string>(),
          total: 0,
        };

        if (!existing.providedProducts.has(keyForItem)) {
          existing.providedProducts.add(keyForItem);
          existing.total += store.price * item.quantity;
        }

        stores.set(key, existing);
      });
    });

    return [...stores.values()]
      .map<BasketSummary>((store) => ({
        key: store.key,
        chain: store.chain,
        storeName: store.storeName,
        address: store.address,
        websiteUrl: store.websiteUrl,
        itemCount: store.providedProducts.size,
        missingProducts: results
          .filter((item, itemIndex) => !store.providedProducts.has(productKey(item, itemIndex)))
          .map((item) => item.productName),
        total: store.total,
      }))
      .sort((a, b) => {
        if (a.missingProducts.length !== b.missingProducts.length) {
          return a.missingProducts.length - b.missingProducts.length;
        }
        return a.total - b.total;
      });
  }, [results, storeType]);

  const unavailableProducts = results.filter((item) => !item.result).map((item) => item.productName);

  if (!listId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
        בחרו רשימת קניות עם מוצרים כדי לראות השוואת סל כאן, בלי מעבר למסך נוסף.
      </div>
    );
  }

  if (!list) return <div className="text-center py-12 text-gray-500">רשימה לא נמצאה</div>;

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">השוואת סל: {list.name}</h2>
          <p className="text-sm text-gray-500">ההשוואה רצה אוטומטית עבור {addressLabel} ומתעדכנת כשמשנים איזור.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => setStoreType("online")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${storeType === "online" ? "bg-white text-blue-700 shadow" : "text-gray-500 hover:text-gray-700"}`}>
              <Monitor size={16} /> אונליין
            </button>
            <button type="button" onClick={() => setStoreType("physical")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${storeType === "physical" ? "bg-white text-blue-700 shadow" : "text-gray-500 hover:text-gray-700"}`}>
              <Store size={16} /> פיזי
            </button>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            {loading ? (
              <span className="inline-flex items-center gap-2"><Loader size={16} className="animate-spin" /> מחשב סל...</span>
            ) : (
              <span>{list.items.length} מוצרים</span>
            )}
          </div>
        </div>
      </div>

      {list.items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>הרשימה ריקה. הוסיפו מוצרים כדי להשוות סל.</p>
        </div>
      )}

      {!loading && results.length > 0 && basketSummaries.length === 0 && (
        <div className="rounded-xl border bg-white p-5 text-center text-sm text-gray-500 shadow-sm">
          לא נמצאו {storeType === "online" ? "חנויות אונליין" : "חנויות פיזיות"} שמספקות את המוצרים ברשימה.
        </div>
      )}

      {basketSummaries.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">סה״כ סל לפי חנות</h3>
            <p className="text-sm text-gray-500">מוצגות {storeType === "online" ? "חנויות אונליין" : "חנויות פיזיות"} עם מחיר סל כולל. אם חסרים מוצרים בחנות, הם מופיעים מתחת למחיר.</p>
          </div>

          {unavailableProducts.length > 0 && (
            <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              לא נמצאו תוצאות עבור: {unavailableProducts.join(", ")}
            </div>
          )}

          <div className="space-y-3">
            {basketSummaries.map((store) => {
              const isComplete = store.missingProducts.length === 0;

              return (
                <div key={store.key} className={`rounded-xl border p-4 ${isComplete ? "border-green-100 bg-green-50/40" : "border-gray-200 bg-white"}`}>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isComplete ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-amber-500" />}
                        <h4 className="text-base font-bold text-gray-900">{store.chain}</h4>
                        <span className="text-sm text-gray-500">{store.storeName}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">{displayLocation(store)}</div>
                      <div className="mt-2 text-sm text-gray-600">זמינים {store.itemCount}/{results.length} מוצרים</div>
                    </div>

                    <div className="text-left" dir="ltr">
                      <div className="text-2xl font-bold text-green-700">₪{store.total.toFixed(2)}</div>
                      {!isComplete && <div className="text-xs text-gray-400">מחיר חלקי</div>}
                    </div>
                  </div>

                  {!isComplete && (
                    <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      החנות לא מספקת: {store.missingProducts.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
