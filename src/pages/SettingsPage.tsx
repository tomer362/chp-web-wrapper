import { useState } from "react";
import { Loader, Monitor, RefreshCw, Store, SlidersHorizontal } from "lucide-react";
import { useUserSettings, type SupermarketType } from "../context/UserSettingsContext";
import { useUserLocation } from "../context/UserLocationContext";
import { locationKey, preloadSupermarketsForAddress } from "../utils/supermarketPreload";

export function SettingsPage() {
  const settings = useUserSettings();
  const { address } = useUserLocation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const preloadSupermarkets = async () => {
    if (!address) {
      setMessage("בחרו אזור קניות בסרגל העליון לפני טעינת רשתות.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const found = await preloadSupermarketsForAddress(address);
      settings.upsertSupermarkets("online", found.online);
      settings.upsertSupermarkets("physical", found.physical);
      settings.markLoaded(locationKey(address));
      setMessage(`נטענו ${found.online.length} רשתות אונליין ו-${found.physical.length} רשתות פיזיות עבור ${address.label}. הבחירות הקיימות נשמרו.`);
    } catch {
      setMessage("לא הצלחנו לטעון רשתות כרגע. נסו שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <SlidersHorizontal size={16} /> הגדרות משתמש
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">סינון רשתות שיווק</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              טענו רשימת רשתות לפי מוצרים נפוצים, ואז בחרו אילו רשתות יופיעו בהשוואות מחיר ובסלי קניות.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {address ? <>אזור נוכחי: <span className="font-medium text-gray-900">{address.label}</span></> : "בחרו אזור קניות בסרגל העליון כדי לטעון גם חנויות פיזיות רלוונטיות."}
          </div>
          <button
            type="button"
            onClick={preloadSupermarkets}
            disabled={loading || !address}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            טען רשתות
          </button>
        </div>

        {(message || settings.lastLoadedAt) && (
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {message || `טעינה אחרונה: ${new Date(settings.lastLoadedAt || 0).toLocaleString("he-IL")}`}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SupermarketSection type="online" title="רשתות אונליין" icon={<Monitor size={18} />} />
        <SupermarketSection type="physical" title="רשתות פיזיות" icon={<Store size={18} />} />
      </div>
    </div>
  );
}

function SupermarketSection({ type, title, icon }: { type: SupermarketType; title: string; icon: React.ReactNode }) {
  const settings = useUserSettings();
  const supermarkets = settings.supermarkets[type];
  const enabledCount = supermarkets.filter((item) => item.enabled).length;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-gray-900">
            {icon} {title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">מופעלות {enabledCount}/{supermarkets.length} רשתות</p>
        </div>
        {supermarkets.length > 0 && (
          <div className="flex gap-2 text-xs font-medium">
            <button type="button" onClick={() => settings.setAllSupermarketsEnabled(type, true)} className="rounded-lg bg-green-50 px-3 py-1.5 text-green-700 hover:bg-green-100">
              הפעל הכל
            </button>
            <button type="button" onClick={() => settings.setAllSupermarketsEnabled(type, false)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600 hover:bg-gray-200">
              כבה הכל
            </button>
          </div>
        )}
      </div>

      {supermarkets.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          עדיין לא נטענו רשתות. לחצו על ״טען רשתות״ כדי להתחיל.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {supermarkets.map((item) => (
            <label key={item.chain} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm transition hover:border-blue-100 hover:bg-blue-50/60">
              <span className="min-w-0 truncate font-medium text-gray-800">{item.chain}</span>
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => settings.setSupermarketEnabled(type, item.chain, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-blue-600"
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
