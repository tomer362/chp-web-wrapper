import { Store, Tag, ExternalLink, MoreVertical } from "lucide-react";
import type { StoreOffer } from "../api/client";

interface Props {
  store: StoreOffer;
  quantity?: number;
  showAddButton?: boolean;
  onAddToList?: () => void;
  onHideChain: () => void;
}

export function StoreRow({ store, quantity = 1, showAddButton, onAddToList, onHideChain }: Props) {
  const totalPrice = store.price * quantity;

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
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" title={store.deal}>
            <Tag size={12} />
            <span className="max-w-48 whitespace-normal break-words">{store.deal.split("|")[0].trim()}</span>
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-left" dir="ltr">
        <span className="text-lg font-bold text-gray-900">₪{store.price.toFixed(2)}</span>
      </td>
      {quantity > 1 && (
        <td className="py-3 px-3 text-left" dir="ltr">
          <div className="text-lg font-bold text-green-700">₪{totalPrice.toFixed(2)}</div>
          <div className="text-xs text-gray-400">× {quantity}</div>
        </td>
      )}
      <td className="py-3 px-3">
        <div className="flex flex-wrap gap-2">
          {showAddButton && <button onClick={onAddToList} className="text-xs bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 px-2.5 py-1.5 rounded transition">+ הוסף</button>}
          <button onClick={onHideChain} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 transition hover:bg-red-50 hover:text-red-600">
            <MoreVertical size={13} /> הסתר
          </button>
        </div>
      </td>
    </tr>
  );
}
