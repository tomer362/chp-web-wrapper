import { useState, useCallback } from "react";
import { Plus, Trash2, CheckSquare, Square, ShoppingCart, ListChecks } from "lucide-react";
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
  };

  const handleProductSelect = useCallback(
    (listId: string, product: ProductResult) => {
      addItem(listId, {
        productName: product.parts?.name_and_contents || product.label,
        barcode: product.barcode,
        quantity: 1,
      });
      setAddingToListId(null);
    },
    [addItem]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input type="text" dir="rtl" placeholder="שם רשימה חדשה..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"><Plus size={16} /> צור רשימה</button>
      </div>

      {lists.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p>עדיין אין רשימות קניות</p>
          <p className="text-sm">צרו רשימה חדשה והתחילו להוסיף מוצרים</p>
        </div>
      )}

      <div className="space-y-3">
        {lists.map((list) => (
          <div key={list.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button className="flex items-center gap-2 font-medium text-gray-900 hover:text-blue-600 transition" onClick={() => setExpanded(expanded === list.id ? null : list.id)}>
                <ListChecks size={18} className="text-gray-400" /> {list.name} <span className="text-xs text-gray-400">({list.items.length})</span>
              </button>
              <div className="flex items-center gap-2">
                {list.items.length > 0 && (
                  <button onClick={() => onCompareList(list.id)} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium transition">השווה מחירים</button>
                )}
                <button onClick={() => removeList(list.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
              </div>
            </div>

            {expanded === list.id && (
              <div className="border-t px-4 py-3 space-y-2">
                {list.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button onClick={() => updateItem(list.id, item.id, { checked: !item.checked })}>
                      {item.checked ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-700"}`}>{item.productName}</span>
                    <input type="number" min={1} className="w-14 text-center border border-gray-200 rounded text-sm py-0.5" value={item.quantity} onChange={(e) => updateItem(list.id, item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                    <span className="text-xs text-gray-400">יח'</span>
                    <button onClick={() => removeItem(list.id, item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className="pt-2">
                  {addingToListId === list.id ? (
                    <ProductSearch cityId={cityId} onSelect={(product) => handleProductSelect(list.id, product)} />
                  ) : (
                    <button onClick={() => setAddingToListId(list.id)} className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1"><Plus size={16} /> הוסיפו מוצר לרשימה</button>
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
