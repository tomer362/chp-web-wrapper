# Website Architecture

This document explains how the React website is structured, how state flows through the app, how it talks to the backend, and how the project is deployed. The backend/API surface is documented separately in [API_FEATURES.md](./API_FEATURES.md).

## Overview

`super.compare` is a Hebrew RTL grocery price comparison single-page app. It has two primary user flows:

1. Compare one product across physical and online stores.
2. Build grocery lists and compare whole baskets across stores.

The frontend is a React 19 app built with Vite and Tailwind CSS 4. The backend is a FastAPI serverless function hosted under `/api/*` on Vercel. The backend wraps `chp.co.il` autocomplete and comparison endpoints.

```text
Browser
  React SPA
    HomePage: location + product search + single-product results
    ListsPage: grocery-list CRUD + basket comparison
    GroceryListsContext: localStorage-backed list state
      |
      | fetch('/api/*')
      v
Vercel
  Static frontend: dist/
  Python API: api/index.py
      |
      v
chp_wrapper
  address.py, product.py, compare.py, models.py
      |
      v
chp.co.il
  Address autocomplete, product autocomplete, obfuscated comparison HTML
```

## Runtime Architecture

### Frontend Runtime

The browser downloads the Vite-built static assets from `dist/`. React Router owns navigation between `/` and `/lists`; Vercel rewrites non-API routes to `index.html`, so browser refreshes work for client routes.

The app uses relative API requests like `/api/products` and `/api/compare`. This keeps local development and production simple: the same frontend code works behind the Vite dev proxy and behind Vercel rewrites.

### Backend Runtime

`api/index.py` is deployed as a Vercel Python serverless function. It exposes FastAPI routes under `/api/*`, creates one `ChpClient` during FastAPI lifespan startup, and forwards requests to the scraper package.

The local Python package lives in `chp_wrapper/src/chp_wrapper`. Vercel installs it through `requirements.txt` via `./chp_wrapper`, and `api/index.py` also inserts the source path into `sys.path` to make imports reliable in the serverless layout.

### External Dependency

All product, address, and price data ultimately comes from `chp.co.il`. The site is treated as an external dependency and can change response HTML, product availability, store listings, or prices at any time. The scraper tests in `tests/test_scraper_regressions.py` guard the most important parsing assumptions.

## Application Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | `HomePage` | Search one product for one shopping area and show store offers. |
| `/lists` | `ListsPage` | Create grocery lists, add products, and compare baskets by store. |

## Component Structure

```text
App
  BrowserRouter
    GroceryListsProvider
      Layout
        Routes
          / -> HomePage
            LocationSearch
            ProductSearch
            ResultsTable
              StoreRow
            Add-to-list modal
          /lists -> ListsPage
            LocationSearch
            GroceryListPanel
              ProductSearch
            ListCompareTable
```

## Key Frontend Modules

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Sets up React Router and wraps the app in `GroceryListsProvider`. |
| `src/components/Layout.tsx` | RTL page shell, sticky header, and navigation. |
| `src/pages/HomePage.tsx` | Single-product comparison flow and add-to-list modal. |
| `src/pages/ListsPage.tsx` | Grocery-list page and comparison area selection. |
| `src/components/SearchBar.tsx` | Reusable autocomplete UI with keyboard/mouse interactions. |
| `src/components/LocationSearch.tsx` | Address autocomplete wrapper. |
| `src/components/ProductSearch.tsx` | Product autocomplete wrapper with image, pack size, manufacturer, and price range display. |
| `src/components/ResultsTable.tsx` | Single-product results with physical/online tabs and sorting. |
| `src/components/StoreRow.tsx` | One store offer row. |
| `src/components/GroceryListPanel.tsx` | Create/delete lists and add/remove/update list items. |
| `src/components/ListCompareTable.tsx` | Basket comparison, online/physical filter, totals, and missing-product summaries. |
| `src/context/GroceryListsContext.tsx` | Local grocery-list state and localStorage persistence. |
| `src/hooks/useAutocomplete.ts` | Debounced autocomplete requests with stale-response protection. |
| `src/api/client.ts` | Typed fetch wrappers for `/api/*`. |

## State Management

State is intentionally simple and local.

| State | Owner | Persistence |
| --- | --- | --- |
| Current address/product search | `HomePage` | In memory only. |
| Single-product comparison result | `HomePage` | In memory only. |
| Grocery comparison area | `ListsPage` | In memory only, defaults to Tel Aviv. |
| Active grocery list being compared | `ListsPage` | In memory only. |
| Grocery lists and items | `GroceryListsContext` | `localStorage['chp-grocery-lists']`. |
| Autocomplete query/results/loading/open | `useAutocomplete` | In memory only. |

## Grocery List Model

Grocery lists are client-side data. There is no user account or remote database.

```ts
interface GroceryList {
  id: string;
  name: string;
  createdAt: number;
  items: GroceryItem[];
}

interface GroceryItem {
  id: string;
  productName: string;
  productSearchValue?: string;
  barcode: string;
  quantity: number; // unit count, or kilograms for price-by-weight items
  checked: boolean;
  packSize?: string;
  manufacturerAndBarcode?: string;
  addedPrice?: number;
  addedStore?: string;
}
```

`productSearchValue` is important for long-lived list items. It stores the autocomplete search value used by CHP, which can be more reliable for later basket comparisons than the display name alone.

## Data Flow

### Single Product Comparison

1. User selects an address in `LocationSearch`.
2. User selects a product in `ProductSearch`.
3. `HomePage` calls `comparePrices(product.barcode, product.value, city_id, street_id)`.
4. `GET /api/compare` returns a `CompareResult` with `physical_stores` and `online_stores`.
5. `ResultsTable` displays either physical or online stores, sorted by price by default.
6. User can add a selected offer to a grocery list for later reference.

### Grocery Basket Comparison

1. User creates a list and adds products through `GroceryListPanel`.
2. Each item stores display name, search value, barcode, quantity, pack size, and manufacturer metadata.
3. User chooses a comparison area in `ListsPage`.
4. `ListCompareTable` automatically compares each list item through `/api/compare`.
5. The table aggregates stores by normalized identity.
6. User can switch between online and physical store modes; the default is online.
7. For each store, the UI shows total basket price, available item count, and missing products.

## Store Matching In Basket Comparison

`ListCompareTable` computes a store key before aggregating basket totals:

1. Online stores are keyed by normalized website hostname, for example `rami-levy.co.il`.
2. Physical stores are keyed by normalized chain, store name, and address.
3. Normalization removes zero-width characters, normalizes Unicode, collapses whitespace, and strips punctuation.

This avoids false missing-products caused by minor text or URL differences between product responses.

## Styling And UX

The app is RTL by default via `dir="rtl"` in `Layout`. Tailwind utility classes drive styling directly in components. The UI emphasizes mobile-friendly controls with larger touch targets in search/list components and responsive grids in page layouts.

Price-by-weight grocery items, such as products whose CHP name includes `מחיר לפי משקל`, use kilogram quantities in basket totals. The list UI offers common portions such as 250g, 500g, 750g, 1kg, 1.5kg, and 2kg while still allowing custom decimal kilogram values.

Design conventions:

- Cards use rounded borders and light shadows.
- Primary actions are blue, comparison/basket actions are green.
- Empty states and warnings are shown inline instead of modal-heavy flows.
- Product and store text allows wrapping because Hebrew product names can be long.

## Deployment

Vercel deployment is controlled by `vercel.json`:

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.py": { "maxDuration": 10 }
  }
}
```

Deployment responsibilities:

- `npm install` installs frontend dependencies.
- `npm run build` runs TypeScript and Vite production build.
- `dist/` is served as static output.
- `/api/*` is handled by the Python FastAPI serverless function.
- `maxDuration` is set to 10 seconds, matching Vercel Hobby limits.

## Development And Validation

Useful commands:

```sh
npm run build
python3 -m unittest discover
```

The scraper tests include live CHP smoke coverage for known products and stores. They warn when product/store availability appears to have changed, and fail on suspicious parser output such as corrupted hidden text, malformed URLs, empty store names, or impossible prices.

## Related Documentation

- [API_FEATURES.md](./API_FEATURES.md): API routes, response models, scraper behavior, error handling, and testing strategy.
