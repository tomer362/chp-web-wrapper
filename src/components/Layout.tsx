import { Link, useLocation } from "react-router-dom";
import { List, Home } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <Link to="/" className="flex shrink-0 items-center justify-center gap-2 text-lg font-bold text-blue-600 sm:justify-start sm:text-xl">
            <span aria-hidden="true">🏪</span>
            <span>chp.site</span>
          </Link>
          <nav className="grid grid-cols-2 gap-2 sm:flex" aria-label="ניווט ראשי">
            {link("/", "השוואת מחירים", Home)}
            {link("/lists", "רשימות קניות", List)}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
