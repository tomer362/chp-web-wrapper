import { Link, useLocation as useRouterLocation } from "react-router-dom";
import { List, Home, Settings } from "lucide-react";
import { LocationSearch } from "./LocationSearch";
import { useUserLocation } from "../context/UserLocationContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useRouterLocation();
  const { address, setAddress } = useUserLocation();
  const link = (to: string, label: string, Icon: typeof Home) => (
    <Link
      to={to}
      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm font-medium transition sm:flex-none sm:px-4 ${
        loc.pathname === to ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="leading-tight">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-2 px-4 py-2 lg:grid-cols-[auto_minmax(16rem,28rem)_auto] lg:items-center">
          <Link to="/" className="flex shrink-0 items-center justify-center gap-2 text-lg font-bold text-blue-600 sm:justify-start sm:text-xl">
            <span aria-hidden="true">🏪</span>
            <span>super.compare</span>
          </Link>
          <div className="min-w-0">
            <LocationSearch initialLabel={address?.label || ""} onSelect={setAddress} onClear={() => setAddress(null)} />
          </div>
          <nav className="grid grid-cols-3 gap-2 sm:flex" aria-label="ניווט ראשי">
            {link("/", "השוואת מחירים", Home)}
            {link("/lists", "רשימות קניות", List)}
            {link("/settings", "הגדרות", Settings)}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
