import { GroceryListPanel } from "../components/GroceryListPanel";
import { ListCompareTable } from "../components/ListCompareTable";
import { useState } from "react";
import { useUserLocation } from "../context/UserLocationContext";

export function ListsPage() {
  const [comparingListId, setComparingListId] = useState<string | null>(null);
  const { address } = useUserLocation();

  return (
    <div className="space-y-4">
      <GroceryListPanel onCompareList={(id) => setComparingListId(id)} cityId={address?.city_id || "0"} streetId={address?.street_id || "0"} activeCompareListId={comparingListId} />
      <ListCompareTable listId={comparingListId} cityId={address?.city_id} streetId={address?.street_id} addressLabel={address?.label} />
    </div>
  );
}
