import { useState, useMemo } from "react";
import { Store, Monitor, ArrowUpDown, MoreVertical } from "lucide-react";
import { StoreRow } from "./StoreRow";
import type { StoreOffer, CompareResult } from "../api/client";
import { useUserSettings } from "../context/UserSettingsContext";

interface Props {
  result: CompareResult;
  quantity?: number;
  onAddToList?: (store: StoreOffer) => void;
}

type SortKey = "price" | "chain";
type Tab = "physical" | "online";

export function ResultsTable({ result, quantity = 1, onAddToList }: Props) {
  const settings = useUserSettings();
  const [tab, setTab] = useState<Tab>("physical");
  const [sortKey, setSortKey] = useState<SortKey>("price");

  const allStores = tab === "physical" ? result.physical_stores : result.online_stores;
  const stores = allStores.filter((store) => settings.isStoreEnabled(tab, store));
  const physicalCount = result.physical_stores.filter((store) => settings.isStoreEnabled("physical", store)).length;
  const onlineCount = result.online_stores.filter((store) => settings.isStoreEnabled("online", store)).length;
  const sorted = useMemo(() => {
    const copy = [...stores];
    copy.sort((a, b) => (sortKey === "price" ? a.price - b.price : a.chain.localeCompare(b.chain)));
    return copy;
  }, [stores, sortKey]);

  if (!result.physical_stores.length && !result.online_stores.length) {
    return <div className="text-center py-12 text-gray-500">לא נמצאו תוצאות</div>;
  }

  const cheapest = sorted.length > 0 ? sorted[0].price : 0;
  const cheapestTotal = cheapest * quantity;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{result.product_name}</h2>
          {quantity > 1 && <p className="text-sm text-gray-500">כמות ברשימה: {quantity} יחידות</p>}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab("physical")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "physical" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            <Store size={16} /> פיזי ({physicalCount})
          </button>
          <button onClick={() => setTab("online")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "online" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            <Monitor size={16} /> אונליין ({onlineCount})
          </button>
        </div>
      </div>

      {allStores.length > 0 && sorted.length === 0 && (
        <div className="rounded-xl border bg-white p-5 text-center text-sm text-gray-500 shadow-sm">
          כל הרשתות בסוג הזה מוסתרות בהגדרות. אפשר להחזיר אותן במסך ההגדרות.
        </div>
      )}

      <div className="space-y-3 sm:hidden">
        {sorted.map((s, i) => (
          <MobileStoreCard key={`${s.chain}-${s.store_name}-${i}`} store={s} quantity={quantity} onAddToList={onAddToList ? () => onAddToList(s) : undefined} onHideChain={() => settings.setSupermarketEnabled(tab, s.chain, false)} />
        ))}
      </div>

      {sorted.length > 0 && <div className="hidden overflow-x-auto rounded-xl border bg-white shadow-sm sm:block">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-3 text-right">רשת</th>
              <th className="py-3 px-3 text-right">חנות</th>
              <th className="py-3 px-3 text-right">{tab === "online" ? "אתר" : "כתובת"}</th>
              <th className="py-3 px-3 text-right">מבצע</th>
              <th className="py-3 px-3 text-left cursor-pointer select-none hover:text-gray-700" onClick={() => setSortKey(sortKey === "price" ? "chain" : "price")}>
                <span className="inline-flex items-center gap-1">מחיר <ArrowUpDown size={12} /></span>
              </th>
              {quantity > 1 && <th className="py-3 px-3 text-left">סה״כ</th>}
              <th className="py-3 px-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <StoreRow key={`${s.chain}-${s.store_name}-${i}`} store={s} quantity={quantity} showAddButton={!!onAddToList} onAddToList={() => onAddToList?.(s)} onHideChain={() => settings.setSupermarketEnabled(tab, s.chain, false)} />
            ))}
          </tbody>
        </table>
      </div>}

      {cheapest > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          הזול ביותר: <span className="font-bold text-green-600">₪{cheapest.toFixed(2)}</span>
          {quantity > 1 && <> | סה״כ לכמות: <span className="font-bold text-green-600">₪{cheapestTotal.toFixed(2)}</span></>}
          {" — "}{sorted[0]?.chain} / {sorted[0]?.store_name}
          {sorted.length > 1 && <> | הפרש מהיקר ביותר: ₪{(sorted[sorted.length - 1].price - cheapest).toFixed(2)}</>}
        </div>
      )}
    </div>
  );
}

function MobileStoreCard({ store, quantity, onAddToList, onHideChain }: { store: StoreOffer; quantity: number; onAddToList?: () => void; onHideChain: () => void }) {
  const totalPrice = store.price * quantity;
  const location = store.website_url ? store.website_url.replace(/https?:\/\//, "").split("/")[0] : store.address || "";

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900">{store.chain}</div>
          <div className="mt-1 text-sm text-gray-600">{store.store_name}</div>
        </div>
        <div className="shrink-0 text-left" dir="ltr">
          <div className="text-2xl font-bold text-gray-900">₪{store.price.toFixed(2)}</div>
          {quantity > 1 && <div className="text-xs text-gray-400">× {quantity}</div>}
        </div>
      </div>

      {location && (
        <div className="mt-3 break-words text-sm text-gray-500" dir="auto">
          {store.website_url ? (
            <a href={store.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline-offset-2 hover:underline">
              {location}
            </a>
          ) : location}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {store.deal ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" title={store.deal}>
            {store.deal.split("|")[0].trim()}
          </span>
        ) : <span className="text-xs text-gray-300">אין מבצע</span>}
        {quantity > 1 && <span className="text-sm font-bold text-green-700" dir="ltr">סה״כ ₪{totalPrice.toFixed(2)}</span>}
        <div className="flex flex-wrap gap-2">
          {onAddToList && <button onClick={onAddToList} className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-blue-600 hover:text-white">+ הוסף</button>}
          <button onClick={onHideChain} className="inline-flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-red-50 hover:text-red-600">
            <MoreVertical size={13} /> הסתר רשת
          </button>
        </div>
      </div>
    </div>
  );
}
