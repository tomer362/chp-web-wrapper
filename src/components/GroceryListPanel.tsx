import { useState, useCallback } from "react";
import { Archive, Check, Pencil, Plus, RotateCcw, Trash2, ShoppingCart, ListChecks, X } from "lucide-react";
import { useGroceryLists } from "../context/GroceryListsContext";
import { ProductSearch } from "./ProductSearch";
import type { ProductResult } from "../api/client";
import { defaultQuantityForProduct, isWeightedItem, normalizeQuantity, quantityLabel, WEIGHT_PORTIONS } from "../utils/groceryUnits";

interface Props {
  onCompareList: (listId: string) => void;
  cityId: string;
  streetId: string;
  activeCompareListId: string | null;
}

export function GroceryListPanel({ onCompareList, cityId, streetId, activeCompareListId }: Props) {
  const { lists, addList, removeList, renameList, archiveList, unarchiveList, addItem, updateItem, removeItem } = useGroceryLists();
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const visibleLists = lists.filter((list) => Boolean(list.archivedAt) === showArchived);
  const activeCount = lists.filter((list) => !list.archivedAt).length;
  const archivedCount = lists.length - activeCount;

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
        productSearchValue: product.value || product.label,
        barcode: product.barcode,
        quantity: defaultQuantityForProduct(product),
        packSize: product.parts?.pack_size,
        manufacturerAndBarcode: product.parts?.manufacturer_and_barcode,
        image: product.parts?.small_image,
      });
      setAddingToListId(null);
      setExpanded(listId);
    },
    [addItem]
  );

  const startRename = (listId: string, name: string) => {
    setEditingListId(listId);
    setEditingName(name);
  };

  const saveRename = () => {
    if (!editingListId) return;
    const nextName = editingName.trim();
    if (nextName) renameList(editingListId, nextName);
    setEditingListId(null);
    setEditingName("");
  };

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

      <div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1 text-sm">
        <button type="button" onClick={() => setShowArchived(false)} className={`rounded-lg px-3 py-1.5 font-medium transition ${!showArchived ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
          רשימות פעילות ({activeCount})
        </button>
        <button type="button" onClick={() => setShowArchived(true)} className={`rounded-lg px-3 py-1.5 font-medium transition ${showArchived ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
          ארכיון ({archivedCount})
        </button>
      </div>

      {visibleLists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">{showArchived ? "אין רשימות בארכיון" : "עדיין אין רשימות קניות"}</p>
          {!showArchived && <p className="text-sm">צרו רשימה חדשה והתחילו להוסיף מוצרים</p>}
        </div>
      )}

      <div className="space-y-3">
        {visibleLists.map((list) => (
          <div key={list.id} className="overflow-visible rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-right font-medium text-gray-900 transition hover:text-blue-600"
                  onClick={() => setExpanded(expanded === list.id ? null : list.id)}
                  aria-expanded={expanded === list.id}
                >
                  <ListChecks size={18} className="shrink-0 text-gray-400" />
                  {editingListId === list.id ? (
                    <input
                      autoFocus
                      type="text"
                      dir="rtl"
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") setEditingListId(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="truncate">{list.name}</span>
                  )}
                  <span className="shrink-0 text-xs text-gray-400">({list.items.length})</span>
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {editingListId === list.id ? (
                  <button type="button" onClick={saveRename} aria-label={`שמור שם עבור ${list.name}`} className="rounded-lg p-2 text-green-600 transition hover:bg-green-50"><Check size={16} /></button>
                ) : (
                  <button type="button" onClick={() => startRename(list.id, list.name)} aria-label={`שנה שם של ${list.name}`} className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                )}
                {!showArchived && list.items.length > 0 && (
                  <button type="button" onClick={() => onCompareList(list.id)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeCompareListId === list.id ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>השווה מחירים</button>
                )}
                {showArchived ? (
                  <button type="button" onClick={() => unarchiveList(list.id)} aria-label={`החזר את ${list.name} מהארכיון`} className="rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600"><RotateCcw size={16} /></button>
                ) : (
                  <button type="button" onClick={() => archiveList(list.id)} aria-label={`העבר את ${list.name} לארכיון`} className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600"><Archive size={16} /></button>
                )}
                <button type="button" onClick={() => removeList(list.id)} aria-label={`מחק את ${list.name}`} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>

            {expanded === list.id && (
              <div className="space-y-3 border-t px-4 py-3">
                {list.items.length === 0 && addingToListId !== list.id && (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">הרשימה ריקה. הוסיפו מוצר כדי להתחיל.</p>
                )}

                {list.items.map((item) => {
                  const weighted = isWeightedItem(item);

                  return (
                    <div key={item.id} className="group grid gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-start sm:bg-transparent sm:p-2">
                      <div className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] gap-3 text-right sm:grid-cols-[3rem_minmax(0,1fr)]">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white sm:h-12 sm:w-12">
                          {item.image ? (
                            <img src={`data:image/png;base64,${item.image}`} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                          ) : (
                            <ShoppingCart size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-2 whitespace-normal break-words text-sm font-medium leading-5 text-gray-800">{item.productName}</div>
                          {(item.packSize || item.manufacturerAndBarcode || weighted) && (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                              {item.packSize && <span>כמות/יחידה: {item.packSize}</span>}
                              {weighted && <span className="font-medium text-blue-600">מחושב לפי מחיר לק״ג</span>}
                              {item.manufacturerAndBarcode && <span className="line-clamp-1">{item.manufacturerAndBarcode}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={weighted ? 0.05 : 1}
                            step={weighted ? 0.05 : 1}
                            inputMode="decimal"
                            dir="ltr"
                            aria-label={`כמות עבור ${item.productName}`}
                            className="w-24 rounded-lg border border-gray-200 bg-white py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={item.quantity}
                            onChange={(e) => updateItem(list.id, item.id, { quantity: normalizeQuantity(parseFloat(e.target.value), weighted) })}
                          />
                          <span className="shrink-0 text-xs text-gray-500">{quantityLabel(item)}</span>
                        </div>
                        {weighted && (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {WEIGHT_PORTIONS.map((portion) => (
                              <button
                                key={portion.value}
                                type="button"
                                onClick={() => updateItem(list.id, item.id, { quantity: portion.value })}
                                className={`rounded-full border px-2 py-1 text-xs transition ${item.quantity === portion.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-700"}`}
                              >
                                {portion.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => removeItem(list.id, item.id)} aria-label={`הסר את ${item.productName}`} className="justify-self-start rounded p-1.5 text-gray-400 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={16} /></button>
                    </div>
                  );
                })}

                <div className="relative z-10 pt-2">
                  {addingToListId === list.id ? (
                    <div className="space-y-2">
                      <ProductSearch cityId={cityId} streetId={streetId} onSelect={(product) => handleProductSelect(list.id, product)} />
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
