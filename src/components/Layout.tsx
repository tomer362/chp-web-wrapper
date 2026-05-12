import { Link, useLocation } from "react-router-dom";
import { List, Home } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const link = (to: string, label: string, Icon: typeof Home) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
        loc.pathname === to ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">🏪 chp.site</Link>
          <nav className="flex gap-2">
            {link("/", "השוואת מחירים", Home)}
            {link("/lists", "רשימות קניות", List)}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
