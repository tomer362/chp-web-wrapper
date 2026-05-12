import { useState, useCallback } from "react";
import { Plus, Trash2, CheckSquare, Square, ShoppingCart, ListChecks, X } from "lucide-react";
import { useGroceryLists } from "../context/GroceryListsContext";
import { ProductSearch } from "./ProductSearch";
import type { ProductResult } from "../api/client";

interface Props {
  onCompareList: (listId: string) => void;
  cityId: string;
}

export function GroceryListPanel({ onCompareList, cityId }: Props) {
  const { lists, addList, removeList, addItem, updateItem, removeItem } = useGroceryLists();
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const list = addList(newName.trim());
    setNewName("");
    setExpanded(list.id);
    setAddingToListId(list.id);
  };

  const handleProductSelect = useCallback(
    (listId: string, product: ProductResult) => {
      addItem(listId, {
        productName: product.parts?.name_and_contents || product.label,
        barcode: product.barcode,
        quantity: 1,
      });
      setAddingToListId(null);
      setExpanded(listId);
    },
    [addItem]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <input
          type="text"
          dir="rtl"
          placeholder="שם רשימה חדשה..."
          className="min-h-12 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:py-2 sm:text-sm"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2 sm:text-sm"
        >
          <Plus size={18} /> צור רשימה
        </button>
      </div>

      {lists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">עדיין אין רשימות קניות</p>
          <p className="text-sm">צרו רשימה חדשה והתחילו להוסיף מוצרים</p>
        </div>
      )}

      <div className="space-y-3">
        {lists.map((list) => (
          <div key={list.id} className="overflow-visible rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-right font-medium text-gray-900 transition hover:text-blue-600"
                onClick={() => setExpanded(expanded === list.id ? null : list.id)}
                aria-expanded={expanded === list.id}
              >
                <ListChecks size={18} className="shrink-0 text-gray-400" />
                <span className="truncate">{list.name}</span>
                <span className="shrink-0 text-xs text-gray-400">({list.items.length})</span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {list.items.length > 0 && (
                  <button type="button" onClick={() => onCompareList(list.id)} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-200">השווה מחירים</button>
                )}
                <button type="button" onClick={() => removeList(list.id)} aria-label={`מחק את ${list.name}`} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>

            {expanded === list.id && (
              <div className="space-y-3 border-t px-4 py-3">
                {list.items.length === 0 && addingToListId !== list.id && (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">הרשימה ריקה. הוסיפו מוצר כדי להתחיל.</p>
                )}

                {list.items.map((item) => (
                  <div key={item.id} className="group flex items-center gap-2 rounded-lg py-1">
                    <button type="button" className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100" onClick={() => updateItem(list.id, item.id, { checked: !item.checked })} aria-label={item.checked ? "סמן כמוצר שלא נקנה" : "סמן כמוצר שנקנה"}>
                      {item.checked ? <CheckSquare size={20} className="text-green-500" /> : <Square size={20} className="text-gray-400" />}
                    </button>
                    <span className={`min-w-0 flex-1 truncate text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.productName}</span>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      dir="ltr"
                      aria-label={`כמות עבור ${item.productName}`}
                      className="w-16 rounded-lg border border-gray-200 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.quantity}
                      onChange={(e) => updateItem(list.id, item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                    <span className="shrink-0 text-xs text-gray-400">יח'</span>
                    <button type="button" onClick={() => removeItem(list.id, item.id)} aria-label={`הסר את ${item.productName}`} className="rounded p-1 text-gray-400 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                ))}

                <div className="relative z-10 pt-2">
                  {addingToListId === list.id ? (
                    <div className="space-y-2">
                      <ProductSearch cityId={cityId} onSelect={(product) => handleProductSelect(list.id, product)} />
                      <button type="button" onClick={() => setAddingToListId(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                        <X size={14} /> ביטול הוספה
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingToListId(list.id)} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800"><Plus size={16} /> הוסיפו מוצר לרשימה</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
