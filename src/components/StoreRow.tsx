import { Store, Tag, ExternalLink } from "lucide-react";
import type { StoreOffer } from "../api/client";

interface Props {
  store: StoreOffer;
  showAddButton?: boolean;
  onAddToList?: () => void;
}

export function StoreRow({ store, showAddButton, onAddToList }: Props) {
  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <Store size={16} className="text-gray-400 shrink-0" />
          <span className="font-medium text-sm">{store.chain}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-sm text-gray-700">{store.store_name}</td>
      <td className="py-3 px-3 text-sm text-gray-500">
        {store.website_url ? (
          <a href={store.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
            <ExternalLink size={14} />
            {store.website_url.replace(/https?:\/\//, "").split("/")[0]}
          </a>
        ) : (store.address || "")}
      </td>
      <td className="py-3 px-3">
        {store.deal ? (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full" title={store.deal}>
            <Tag size={12} />
            {store.deal.split("|")[0].trim().slice(0, 20)}
            {store.deal.length > 20 ? "..." : ""}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-left" dir="ltr">
        <span className="text-lg font-bold text-gray-900">₪{store.price.toFixed(2)}</span>
      </td>
      {showAddButton && (
        <td className="py-3 px-3">
          <button onClick={onAddToList} className="text-xs bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 px-2.5 py-1.5 rounded transition">+ הוסף</button>
        </td>
      )}
    </tr>
  );
}
