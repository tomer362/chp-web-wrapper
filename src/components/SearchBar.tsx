import { useState, useRef, useEffect } from "react";
import { Search, X, Loader } from "lucide-react";

export interface SearchItem {
  label: string;
  value: string;
}

interface Props {
  placeholder: string;
  items: SearchItem[];
  loading: boolean;
  open: boolean;
  onQuery: (q: string) => void;
  onSelect: (item: SearchItem) => void;
  onClose?: () => void;
  renderItem?: (item: SearchItem) => React.ReactNode;
}

export function SearchBar({ placeholder, items, loading, open, onQuery, onSelect, onClose, renderItem }: Props) {
  const [text, setText] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => {
    (document.activeElement as HTMLElement)?.blur();
    setFocusedIdx(-1);
    onClose?.();
  };

  const pick = (item: SearchItem) => {
    setText(item.label);
    onSelect(item);
    close();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && items[focusedIdx]) {
      pick(items[focusedIdx]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          dir="rtl"
          placeholder={placeholder}
          className="w-full pr-10 pl-10 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={text}
          onChange={(e) => { setText(e.target.value); onQuery(e.target.value); }}
          onKeyDown={handleKey}
        />
        {loading && <Loader className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />}
        {text && !loading && (
          <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => { setText(""); onQuery(""); }}>
            <X size={18} />
          </button>
        )}
      </div>
      {open && items.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {items.map((item, i) => (
            <li
              key={item.value}
              className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-3 ${
                i === focusedIdx ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => setFocusedIdx(i)}
              onClick={() => pick(item)}
            >
              {renderItem ? renderItem(item) : <span>{item.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
