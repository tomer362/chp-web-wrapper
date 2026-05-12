import { useState } from "react";
import { Store, Tag, ExternalLink, MoreVertical } from "lucide-react";
import type { StoreOffer } from "../api/client";
import { storeWebsiteHost, storeWebsiteHref } from "../utils/storeDisplay";

interface Props {
  store: StoreOffer;
  quantity?: number;
  showAddButton?: boolean;
  onAddToList?: () => void;
  onHideChain: () => void;
}

export function StoreRow({ store, quantity = 1, showAddButton, onAddToList, onHideChain }: Props) {
  const totalPrice = store.price * quantity;
  const websiteHost = storeWebsiteHost(store.website_url);
  const websiteHref = storeWebsiteHref(store.website_url);

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
          <a href={websiteHref} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <ExternalLink size={14} />
            <span>{websiteHost}</span>
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
          <StoreActionMenu onHideChain={onHideChain} />
        </div>
      </td>
    </tr>
  );
}

function StoreActionMenu({ onHideChain }: { onHideChain: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="פעולות לחנות"
        className="rounded-full bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-44 rounded-xl border bg-white p-1 text-right shadow-lg">
          <button
            type="button"
            onClick={() => {
              onHideChain();
              setOpen(false);
            }}
            className="w-full rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-red-50 hover:text-red-600"
          >
            הסתר רשת זו מהשוואות
          </button>
        </div>
      )}
    </div>
  );
}
