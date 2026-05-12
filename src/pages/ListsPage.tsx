import { GroceryListPanel } from "../components/GroceryListPanel";
import { ListCompareTable } from "../components/ListCompareTable";
import { LocationSearch } from "../components/LocationSearch";
import { useState } from "react";
import type { AddressResult } from "../api/client";

export function ListsPage() {
  const [comparingListId, setComparingListId] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressResult>({ label: "תל אביב", value: "תל אביב", city_id: "5000", street_id: "9000" });

  if (comparingListId) {
    return <ListCompareTable listId={comparingListId} cityId={address.city_id} streetId={address.street_id} onBack={() => setComparingListId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">איזור להשוואה</label>
        <LocationSearch onSelect={(a) => setAddress(a)} />
      </div>
      <GroceryListPanel onCompareList={(id) => setComparingListId(id)} cityId={address.city_id} />
    </div>
  );
}
