import { useState, useEffect, useRef } from "react";

export function useAutocomplete<T>(
  fetchFn: (query: string) => Promise<T[]>,
  minLength = 2
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestId = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    requestId.current += 1;
    const currentRequest = requestId.current;

    if (normalizedQuery.length < minLength) {
      clearTimeout(timer.current);
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const data = await fetchFn(normalizedQuery);
        if (currentRequest !== requestId.current) return;
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        if (currentRequest !== requestId.current) return;
        setResults([]);
        setOpen(false);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer.current);
  }, [query, fetchFn, minLength]);

  return { query, setQuery, results, loading, open, setOpen };
}
