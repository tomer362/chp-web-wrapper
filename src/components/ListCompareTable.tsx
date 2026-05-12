import { useState } from "react";
import { useGroceryLists } from "../context/GroceryListsContext";
import { comparePrices, type CompareResult } from "../api/client";
import { ResultsTable } from "./ResultsTable";
import { Loader, AlertCircle } from "lucide-react";

interface Props {
  listId: string;
  cityId: string;
  streetId: string;
  onBack: () => void;
}

interface ItemResult {
  productName: string;
  result: CompareResult | null;
  error?: string;
}

export function ListCompareTable({ listId, cityId, streetId, onBack }: Props) {
  const { getList } = useGroceryLists();
  const list = getList(listId);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    if (!list) return;
    setLoading(true);
    const unchecked = list.items.filter((i) => !i.checked);
    const out: ItemResult[] = [];
    for (const item of unchecked) {
      try {
        const r = await comparePrices(item.barcode || "", item.productName, cityId, streetId);
        out.push({ productName: item.productName, result: r });
      } catch {
        out.push({ productName: item.productName, result: null, error: "לא נמצא" });
      }
    }
    setResults(out);
    setLoading(false);
  };

  if (!list) return <div className="text-center py-12 text-gray-500">רשימה לא נמצאה</div>;

  const unchecked = list.items.filter((i) => !i.checked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">&larr; חזרה</button>
          <h2 className="text-xl font-bold mt-1">{list.name}</h2>
        </div>
        <button onClick={runCompare} disabled={loading || unchecked.length === 0} className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader size={18} className="animate-spin" />} השווה מחירים ({unchecked.length})
        </button>
      </div>

      {unchecked.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>כל המוצרים מסומנים כ"נקנה"</p>
        </div>
      )}

      <div className="space-y-8">
        {results.map((r, i) => (
          <div key={i}>
            {r.result ? <ResultsTable result={r.result} /> : (
              <div className="bg-white rounded-xl border shadow-sm p-4 text-center text-gray-400 text-sm">{r.productName} — {r.error || "שגיאה"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
