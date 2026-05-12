import { useCallback } from "react";
import { SearchBar, type SearchItem } from "./SearchBar";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { searchAddress, type AddressResult } from "../api/client";

interface Props {
  onSelect: (item: AddressResult) => void;
  initialLabel?: string;
}

export function LocationSearch({ onSelect, initialLabel }: Props) {
  const fetchFn = useCallback((q: string) => searchAddress(q), []);
  const ac = useAutocomplete(fetchFn, 2);

  const items: SearchItem[] = ac.results.map((r) => ({ label: r.label, value: `${r.city_id}_${r.street_id}` }));

  return (
    <SearchBar
      placeholder="הקלידו עיר או רחוב..."
      items={items}
      loading={ac.loading}
      open={ac.open}
      onQuery={(q) => ac.setQuery(q)}
      onSelect={(item) => {
        const found = ac.results.find((r) => `${r.city_id}_${r.street_id}` === item.value);
        if (found) onSelect(found);
      }}
      onClose={() => ac.setOpen(false)}
      initialText={initialLabel}
      onOpen={() => ac.results.length > 0 && ac.setOpen(true)}
    />
  );
}
