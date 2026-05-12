import { useState } from "react";
import { Search, Loader } from "lucide-react";
import { LocationSearch } from "../components/LocationSearch";
import { ProductSearch } from "../components/ProductSearch";
import { ResultsTable } from "../components/ResultsTable";
import { comparePrices, type AddressResult, type ProductResult, type CompareResult, type StoreOffer } from "../api/client";
import { useGroceryLists } from "../context/GroceryListsContext";

export function HomePage() {
  const [address, setAddress] = useState<AddressResult | null>(null);
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { lists, addItem } = useGroceryLists();
  const [showListPicker, setShowListPicker] = useState<StoreOffer | null>(null);

  const handleCompare = async () => {
    if (!address || !product) return;
    setLoading(true);
    try {
      setResult(await comparePrices(product.barcode, product.value, address.city_id, address.street_id));
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const confirmAdd = (listId: string) => {
    if (!showListPicker || !product) return;
    addItem(listId, {
      productName: result?.product_name || product.value,
      barcode: product.barcode,
      quantity: 1,
      addedPrice: showListPicker.price,
      addedStore: `${showListPicker.chain} - ${showListPicker.store_name}`,
    });
    setShowListPicker(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">איזור קניות</label>
            <LocationSearch onSelect={(a) => setAddress(a)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">מוצר</label>
            <ProductSearch cityId={address?.city_id || "0"} streetId={address?.street_id || "0"} onSelect={(p) => setProduct(p)} />
          </div>
          <button onClick={handleCompare} disabled={!address || !product || loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-2 h-[42px]">
            {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />} בדוק מחיר
          </button>
        </div>
      </div>

      {result && <ResultsTable result={result} onAddToList={(s) => setShowListPicker(s)} />}

      {!result && !loading && (
        <div className="text-center py-20 text-gray-400">
          <Search size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">בחרו אזור קניות ומוצר להשוואת מחירים</p>
        </div>
      )}

      {showListPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowListPicker(null)}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">הוספה לרשימה</h3>
            {lists.length === 0 ? (
              <p className="text-sm text-gray-500 mb-3">אין רשימות. צרו רשימה חדשה קודם.</p>
            ) : (
              <ul className="space-y-1 mb-3">
                {lists.map((l) => (
                  <li key={l.id}><button onClick={() => confirmAdd(l.id)} className="w-full text-right px-3 py-2 hover:bg-gray-100 rounded text-sm">{l.name} ({l.items.length})</button></li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowListPicker(null)} className="text-sm text-gray-500 hover:text-gray-700">ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}
