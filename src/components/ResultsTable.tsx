import { useState, useMemo } from "react";
import { Store, Monitor, ArrowUpDown } from "lucide-react";
import { StoreRow } from "./StoreRow";
import type { StoreOffer, CompareResult } from "../api/client";

interface Props {
  result: CompareResult;
  onAddToList?: (store: StoreOffer) => void;
}

type SortKey = "price" | "chain";
type Tab = "physical" | "online";

export function ResultsTable({ result, onAddToList }: Props) {
  const [tab, setTab] = useState<Tab>("physical");
  const [sortKey, setSortKey] = useState<SortKey>("price");

  const stores = tab === "physical" ? result.physical_stores : result.online_stores;
  const sorted = useMemo(() => {
    const copy = [...stores];
    copy.sort((a, b) => (sortKey === "price" ? a.price - b.price : a.chain.localeCompare(b.chain)));
    return copy;
  }, [stores, sortKey]);

  if (!result.physical_stores.length && !result.online_stores.length) {
    return <div className="text-center py-12 text-gray-500">לא נמצאו תוצאות</div>;
  }

  const cheapest = sorted.length > 0 ? sorted[0].price : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{result.product_name}</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab("physical")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "physical" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            <Store size={16} /> פיזי ({result.physical_stores.length})
          </button>
          <button onClick={() => setTab("online")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "online" ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            <Monitor size={16} /> אונליין ({result.online_stores.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-3 text-right">רשת</th>
              <th className="py-3 px-3 text-right">חנות</th>
              <th className="py-3 px-3 text-right">{tab === "online" ? "אתר" : "כתובת"}</th>
              <th className="py-3 px-3 text-right">מבצע</th>
              <th className="py-3 px-3 text-left cursor-pointer select-none hover:text-gray-700" onClick={() => setSortKey(sortKey === "price" ? "chain" : "price")}>
                <span className="inline-flex items-center gap-1">מחיר <ArrowUpDown size={12} /></span>
              </th>
              {onAddToList && <th className="py-3 px-3 w-16" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <StoreRow key={`${s.chain}-${s.store_name}-${i}`} store={s} showAddButton={!!onAddToList} onAddToList={() => onAddToList?.(s)} />
            ))}
          </tbody>
        </table>
      </div>

      {cheapest > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          הזול ביותר: <span className="font-bold text-green-600">₪{cheapest.toFixed(2)}</span>
          {" — "}{sorted[0]?.chain} / {sorted[0]?.store_name}
          {sorted.length > 1 && <> | הפרש מהיקר ביותר: ₪{(sorted[sorted.length - 1].price - cheapest).toFixed(2)}</>}
        </div>
      )}
    </div>
  );
}
