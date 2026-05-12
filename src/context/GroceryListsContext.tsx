import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface GroceryItem {
  id: string;
  productName: string;
  productSearchValue?: string;
  barcode: string;
  quantity: number;
  checked: boolean;
  packSize?: string;
  manufacturerAndBarcode?: string;
  image?: string;
  addedPrice?: number;
  addedStore?: string;
}

export interface GroceryList {
  id: string;
  name: string;
  createdAt: number;
  archivedAt?: number;
  items: GroceryItem[];
}

interface GroceryListsContextType {
  lists: GroceryList[];
  addList: (name: string) => GroceryList;
  removeList: (id: string) => void;
  renameList: (id: string, name: string) => void;
  archiveList: (id: string) => void;
  unarchiveList: (id: string) => void;
  addItem: (listId: string, item: Omit<GroceryItem, "id" | "checked">) => void;
  updateItem: (listId: string, itemId: string, patch: Partial<GroceryItem>) => void;
  removeItem: (listId: string, itemId: string) => void;
  getList: (id: string) => GroceryList | undefined;
}

const STORAGE_KEY = "chp-grocery-lists";

function load(): GroceryList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const Ctx = createContext<GroceryListsContextType | null>(null);

export function GroceryListsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<GroceryList[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }, [lists]);

  const addList = (name: string) => {
    const list: GroceryList = { id: crypto.randomUUID(), name, createdAt: Date.now(), items: [] };
    setLists((prev) => [...prev, list]);
    return list;
  };

  const removeList = (id: string) => setLists((prev) => prev.filter((l) => l.id !== id));
  const renameList = (id: string, name: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  const archiveList = (id: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, archivedAt: Date.now() } : l)));
  const unarchiveList = (id: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, archivedAt: undefined } : l)));

  const addItem = (listId: string, item: Omit<GroceryItem, "id" | "checked">) => {
    const newItem: GroceryItem = { ...item, id: crypto.randomUUID(), checked: false };
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, items: [...l.items, newItem] } : l)));
  };

  const updateItem = (listId: string, itemId: string, patch: Partial<GroceryItem>) =>
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : l
      )
    );

  const removeItem = (listId: string, itemId: string) =>
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l))
    );

  const getList = (id: string) => lists.find((l) => l.id === id);

  return (
    <Ctx.Provider value={{ lists, addList, removeList, renameList, archiveList, unarchiveList, addItem, updateItem, removeItem, getList }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGroceryLists() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGroceryLists must be inside GroceryListsProvider");
  return c;
}
