# Architecture

## Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌──────────────────────────────────────────┐       │
│  │          React SPA (Vite)                 │       │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐  │       │
│  │  │  Search  │ │ Results  │ │  Lists   │  │       │
│  │  │  Autocom-│ │ Table    │ │  Page    │  │       │
│  │  │  plete   │ │ (sorted) │ │          │  │       │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘  │       │
│  └───────┼───────────┼────────────┼────────┘       │
│          │  fetch(/api/*)         │                 │
└──────────┼───────────┼────────────┼─────────────────┘
           │           │            │
    ┌──────┴───────────┴────────────┴─────────────────┐
    │               Vercel                             │
    │  ┌──────────────────┐  ┌──────────────────────┐ │
    │  │ Python Serverless │  │ Static Files         │ │
    │  │ api/index.py      │  │ dist/ (Vite build)   │ │
    │  │                   │  │                      │ │
    │  │ chp_wrapper lib   │  │ / → index.html       │ │
    │  │ (sys.path import) │  │ /* → SPA fallback    │ │
    │  └───────┬───────────┘  └──────────────────────┘ │
    └──────────┼────────────────────────────────────────┘
               │
    ┌──────────┴────────────────────────────────────────┐
    │              chp.co.il (external)                  │
    │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
    │  │ Address  │  │ Product  │  │ Compare        │  │
    │  │ Autocomp.│  │ Search   │  │ Results (HTML) │  │
    │  │ (JSON)   │  │ (JSON)   │  │ (obfuscated)   │  │
    │  └──────────┘  └──────────┘  └───────┬────────┘  │
    └──────────────────────────────────────┼────────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  Deobfuscation Engine   │
                              │  (compare.py)           │
                              │                         │
                              │  1. Parse inline CSS    │
                              │  2. Build visibility    │
                              │     map from selectors  │
                              │  3. Walk DOM, apply     │
                              │     CSS specificity     │
                              │  4. Extract visible     │
                              │     text only           │
                              └─────────────────────────┘
```

## Scraper Deobfuscation (the key challenge)

chp.co.il returns product comparison as **obfuscated HTML**. Each visible character is wrapped in `<span>`/`<div>` with random `data-xxx` attributes. Decoy/garbage elements are interleaved. Inline `<style>` blocks toggle visibility via CSS attribute selectors.

```
HTML:  <span data-vfoq="LLbbQkiS">ר</span>        ← visible (real)
       <span data-vdoyrbmi="asmlPl">0N</span>     ← hidden (decoy)
       <div id="XyZ" data-abc="XyZ"></div>        ← hidden (decoy)

CSS:   [data-tsdOyVgW="GhqyMW"] { display:inline; }
       span[data-vdOYrbmI="asmlPl"] { display:none; }
       #XyZ[data-abc="XyZ"] { display:none; }
```

The deobfuscator (`chp_wrapper/compare.py`):
1. Extracts all inline `<style>` blocks
2. Parses each CSS selector into a structured rule: `{tag, attr_name, attr_value, has_id, display_none, specificity}`
3. For each element, finds all matching CSS rules
4. Picks the most specific rule (id+attr > tag+attr > attr-only)
5. If the winning rule says `display:none` → element is hidden; otherwise visible
6. Extracts text only from visible elements
7. Also reads `data-discount-desc` from `<button>` elements for full deal descriptions

## Backend API (api/index.py)

| Endpoint | Method | Params | Response |
|----------|--------|--------|----------|
| `/api/health` | GET | — | `{"status":"ok"}` |
| `/api/addresses` | GET | `q`, `from` | `[{label, value, city_id, street_id}]` |
| `/api/products` | GET | `q`, `city_id`, `street_id`, `from` | `[{label, value, barcode, parts}]` |
| `/api/compare` | GET | `barcode`, `product_name`, `city_id`, `street_id`, `from`, `num_results` | `{product_name, physical_stores[], online_stores[]}` |

Built with **FastAPI**, served as a **Vercel Python serverless function** from `api/index.py`.
Imports `chp_wrapper` (sibling package) via `sys.path` + `./chp_wrapper` in `requirements.txt`.

## Frontend (React 19 + Vite + Tailwind CSS 4)

### Component Tree

```
App (BrowserRouter)
├── Layout (sticky header + nav: "השוואת מחירים" | "רשימות קניות")
├── HomePage
│   ├── LocationSearch (autocomplete → city_id/street_id)
│   ├── ProductSearch (autocomplete → barcode + product parts)
│   ├── [בדוק מחיר] button
│   └── ResultsTable
│       ├── Tabs: פיזי / אונליין
│       ├── Sort: by price / chain
│       └── StoreRow[] (chain, store, address/url, deal, price, [add to list])
├── ListsPage
│   ├── LocationSearch (for bulk compare)
│   └── GroceryListPanel
│       ├── Create/delete/rename lists
│       └── GroceryListItem[] (productName, qty, checked, [compare])
│           └── ProductSearch (autocomplete when adding items)
└── ListCompareTable
    └── ResultsTable[] (one per product, with bulk compare)
```

### State Management

- **Search state**: Local `useState` in pages (address, product, results)
- **Autocomplete**: `useAutocomplete` hook — debounced (250ms), fetches on query change
- **Grocery lists**: `GroceryListsContext` — persisted to `localStorage["chp-grocery-lists"]`

### Grocery List Data Model (localStorage)

```typescript
interface GroceryList {
  id: string;          // crypto.randomUUID()
  name: string;
  createdAt: number;
  items: GroceryItem[];
}

interface GroceryItem {
  id: string;
  productName: string;
  barcode: string;
  quantity: number;
  checked: boolean;
  addedPrice?: number;   // price when added (for reference)
  addedStore?: string;
}
```

## Vercel Deployment

The repo is set up for zero-config deployment on Vercel:

1. **Python API** (`api/index.py`): Auto-detected as Python serverless function. Installs deps from `requirements.txt` (includes `./chp_wrapper` local package). Has `maxDuration: 10` (max on hobby plan = 10s timeout).

2. **React Frontend** (`package.json` at root): Auto-detected as Vite framework. Builds to `dist/` via `npm run build`.

3. **Routing** (`vercel.json`):
   - `/api/*` → Python serverless function
   - `/*` → SPA fallback to `index.html`

### `maxDuration: 10` explained

Vercel's **hobby plan** limits serverless function execution to **10 seconds**. Our Python function calls chp.co.il's external API which typically responds in 1-3 seconds. We set `maxDuration: 10` to allow the maximum possible time on the hobby plan. If chp.co.il is slow, the function may timeout with a 504 error. On the **pro plan**, this can be increased to 900 seconds (15 minutes).

## Files

```
/
├── api/index.py              FastAPI serverless (Vercel Python)
├── chp_wrapper/              Python scraper library
│   ├── src/chp_wrapper/
│   │   ├── client.py         HTTP session + u param generation
│   │   ├── address.py        Location autocomplete → city_id/street_id
│   │   ├── product.py        Product search → barcode
│   │   ├── compare.py        Comparison fetch + CSS deobfuscation
│   │   └── models.py         Pydantic models
│   └── ...
├── src/                      React frontend
│   ├── api/client.ts         Fetch wrappers for /api/*
│   ├── hooks/useAutocomplete.ts  Debounced autocomplete hook
│   ├── context/GroceryListsContext.tsx  localStorage CRUD
│   ├── components/           SearchBar, ResultsTable, StoreRow, ...
│   └── pages/                HomePage, ListsPage
├── vercel.json               Vercel deployment config
├── requirements.txt          Python dependencies
├── package.json              Node.js dependencies (Vite + React)
└── vite.config.ts
```
