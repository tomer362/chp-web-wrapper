import { useCallback } from "react";
import { SearchBar, type SearchItem } from "./SearchBar";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { searchProducts, type ProductResult } from "../api/client";

interface Props {
  cityId: string;
  onSelect: (item: ProductResult) => void;
}

export function ProductSearch({ cityId, onSelect }: Props) {
  const fetchFn = useCallback((q: string) => searchProducts(q, cityId), [cityId]);
  const ac = useAutocomplete(fetchFn, 2);

  const items: SearchItem[] = ac.results.map((r) => ({ label: r.label, value: r.barcode }));

  return (
    <SearchBar
      placeholder="הקלידו שם מוצר או ברקוד..."
      items={items}
      loading={ac.loading}
      open={ac.open}
      onQuery={(q) => ac.setQuery(q)}
      onSelect={(item) => {
        const found = ac.results.find((r) => r.barcode === item.value);
        if (found) onSelect(found);
      }}
      onClose={() => ac.setOpen(false)}
      renderItem={(item) => {
        const prod = ac.results.find((r) => r.barcode === item.value);
        if (!prod) return <span>{item.label}</span>;
        return (
          <div className="flex items-center gap-3 w-full">
            {prod.parts?.small_image && (
              <img src={`data:image/png;base64,${prod.parts.small_image}`} alt="" className="w-8 h-8 object-contain rounded" />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{prod.parts?.name_and_contents || prod.label}</div>
              {prod.parts?.manufacturer_and_barcode && (
                <div className="text-xs text-gray-500 truncate">{prod.parts.manufacturer_and_barcode}</div>
              )}
            </div>
            {prod.parts?.price_range && (
              <span className="text-xs text-green-600 whitespace-nowrap">₪{prod.parts.price_range[0]}–{prod.parts.price_range[1]}</span>
            )}
          </div>
        );
      }}
    />
  );
}
