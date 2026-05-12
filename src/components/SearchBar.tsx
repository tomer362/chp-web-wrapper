import { useState, useRef, useEffect, useId } from "react";
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
  onOpen?: () => void;
  onClear?: () => void;
  initialText?: string;
  renderItem?: (item: SearchItem) => React.ReactNode;
}

const MAX_DROPDOWN_HEIGHT = 320;

export function SearchBar({ placeholder, items, loading, open, onQuery, onSelect, onClose, onOpen, onClear, initialText = "", renderItem }: Props) {
  const [text, setText] = useState(initialText);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const isDropdownOpen = open && items.length > 0;

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (focusedIdx >= items.length) setFocusedIdx(items.length - 1);
  }, [focusedIdx, items.length]);

  const close = () => {
    setFocusedIdx(-1);
    onClose?.();
  };

  const pick = (item: SearchItem) => {
    setText(item.label);
    onSelect(item);
    inputRef.current?.blur();
    close();
  };

  const clear = () => {
    setText("");
    setFocusedIdx(-1);
    onQuery("");
    onClear?.();
    onClose?.();
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isDropdownOpen) onOpen?.();
      setFocusedIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && items[focusedIdx]) {
      e.preventDefault();
      pick(items[focusedIdx]);
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
      close();
    }
  };

  const dropdown = isDropdownOpen ? (
    <ul
      id={listboxId}
      role="listbox"
      dir="rtl"
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 shadow-2xl ring-1 ring-black/5"
      style={{ maxHeight: MAX_DROPDOWN_HEIGHT }}
    >
      {items.map((item, i) => (
        <li
          id={`${listboxId}-${i}`}
          key={`${item.value}-${i}`}
          role="option"
          aria-selected={i === focusedIdx}
          className={`min-h-12 px-3 py-2.5 text-sm cursor-pointer flex items-center gap-3 transition ${
            i === focusedIdx ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
          }`}
          onMouseEnter={() => setFocusedIdx(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(item)}
        >
          {renderItem ? renderItem(item) : <span className="truncate">{item.label}</span>}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          dir="rtl"
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-controls={isDropdownOpen ? listboxId : undefined}
          aria-activedescendant={focusedIdx >= 0 ? `${listboxId}-${focusedIdx}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-10 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2.5 sm:text-sm"
          value={text}
          onFocus={() => {
            if (items.length > 0) onOpen?.();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setFocusedIdx(-1);
            onQuery(e.target.value);
          }}
          onKeyDown={handleKey}
        />
        {loading && <Loader className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={18} />}
        {text && !loading && (
          <button type="button" aria-label="נקה חיפוש" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={clear}>
            <X size={18} />
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
