import { useMemo, useState } from "react";
import { useGroceryLists } from "../context/GroceryListsContext";
import { comparePrices, type CompareResult, type StoreOffer } from "../api/client";
import { Loader, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  listId: string;
  cityId: string;
  streetId: string;
  onBack: () => void;
}

interface ItemResult {
  productName: string;
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

function storeKey(store: StoreOffer) {
  return [store.chain, store.store_name, store.address || store.website_url || ""].join("|");
}

function productKey(item: ItemResult, index: number) {
  return `${index}-${item.productName}`;
}

function displayLocation(store: Pick<BasketSummary, "address" | "websiteUrl">) {
  return store.address || store.websiteUrl || "—";
}

export function ListCompareTable({ listId, cityId, streetId, onBack }: Props) {
  const { getList } = useGroceryLists();
  const list = getList(listId);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    if (!list) return;
    setLoading(true);
    const out: ItemResult[] = [];

    for (const item of list.items) {
      try {
        const r = await comparePrices(item.barcode || "", item.productName, cityId, streetId);
        out.push({ productName: item.productName, quantity: item.quantity, result: r });
      } catch {
        out.push({ productName: item.productName, quantity: item.quantity, result: null, error: "לא נמצא" });
      }
    }

    setResults(out);
    setLoading(false);
  };

  const basketSummaries = useMemo(() => {
    const stores = new Map<string, BasketStore>();

    results.forEach((item, itemIndex) => {
      const storesForItem = item.result ? [...item.result.physical_stores, ...item.result.online_stores] : [];
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
  }, [results]);

  const unavailableProducts = results.filter((item) => !item.result).map((item) => item.productName);

  if (!list) return <div className="text-center py-12 text-gray-500">רשימה לא נמצאה</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">&larr; חזרה</button>
          <h2 className="text-xl font-bold mt-1">{list.name}</h2>
        </div>
        <button onClick={runCompare} disabled={loading || list.items.length === 0} className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader size={18} className="animate-spin" />} חשב סל ({list.items.length})
        </button>
      </div>

      {list.items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>הרשימה ריקה. הוסיפו מוצרים כדי להשוות סל.</p>
        </div>
      )}

      {results.length > 0 && basketSummaries.length === 0 && (
        <div className="rounded-xl border bg-white p-5 text-center text-sm text-gray-500 shadow-sm">
          לא נמצאו חנויות שמספקות את המוצרים ברשימה.
        </div>
      )}

      {basketSummaries.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">סה״כ סל לפי חנות</h3>
            <p className="text-sm text-gray-500">מוצגות חנויות עם מחיר סל כולל. אם חסרים מוצרים בחנות, הם מופיעים מתחת למחיר.</p>
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
