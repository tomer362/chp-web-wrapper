# API Features

This document describes the backend API and scraper package used by the website. For the frontend architecture and deployment overview, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Purpose

The API exposes a small, typed HTTP layer over `chp.co.il` data:

1. Address autocomplete.
2. Product autocomplete.
3. Product price comparison across physical and online stores.
4. Health check for deployment verification.

The public browser-facing API lives under `/api/*`. The implementation is FastAPI in `api/index.py`, backed by the local Python package `chp_wrapper`.

## API Runtime

```text
Browser fetch('/api/*')
  -> Vercel rewrite
  -> api/index.py FastAPI app
  -> ChpClient
  -> chp_wrapper address/product/compare functions
  -> chp.co.il
```

`api/index.py` creates a shared `ChpClient` during FastAPI lifespan startup and closes it during shutdown. `ChpClient` owns the `aiohttp.ClientSession`, default headers, `Referer`, `X-Requested-With`, and the CHP `u` query parameter.

## Endpoints

### `GET /api/health`

Checks that the serverless function is reachable.

Request parameters: none.

Response:

```json
{ "status": "ok" }
```

Typical use:

- Vercel smoke test after deployment.
- Basic uptime check.

### `GET /api/addresses`

Searches CHP address autocomplete and returns selectable shopping areas.

Query parameters:

| Name | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `q` | string | yes | none | Minimum length is 2. |
| `from` | integer | no | `0` | Pagination offset passed through to CHP. |

Example:

```http
GET /api/addresses?q=תל%20אביב
```

Response shape:

```json
[
  {
    "label": "תל אביב",
    "value": "תל אביב",
    "city_id": "5000",
    "street_id": "9000"
  }
]
```

Frontend usage:

- `LocationSearch` calls `searchAddress` through `useAutocomplete`.
- The selected `city_id` and `street_id` are passed to product search and compare requests.

### `GET /api/products`

Searches CHP product autocomplete for the selected area.

Query parameters:

| Name | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `q` | string | yes | none | Minimum length is 2. Can be product name or barcode. |
| `city_id` | string | no | `0` | Selected city from address autocomplete. |
| `street_id` | string | no | `0` | Selected street from address autocomplete. |
| `from` | integer | no | `0` | Pagination offset passed through to CHP. |

Example:

```http
GET /api/products?q=חלב&city_id=5000&street_id=9000
```

Response shape:

```json
[
  {
    "label": "חלב תנובה טרי 3% בקרטון, 1 ליטר",
    "value": "חלב תנובה טרי 3% בקרטון, 1 ליטר",
    "barcode": "7290027600007_7290004127275",
    "parts": {
      "name_and_contents": "חלב תנובה טרי 3% בקרטון, 1 ליטר",
      "manufacturer_and_barcode": "תנובה | 7290004127275",
      "pack_size": "1 ליטר",
      "small_image": "...base64...",
      "chainnames": "...",
      "price_range": ["7.20", "8.90"]
    }
  }
]
```

Notes:

- CHP uses compound product identifiers. The app treats `barcode` as an opaque string.
- `parts.small_image` is base64 image data intended for autocomplete display.
- `parts.price_range` is optional and can be absent.

Frontend usage:

- `ProductSearch` displays product name, image, pack size, manufacturer/barcode, and price range.
- Grocery-list items store both `productName` and `productSearchValue` to make later comparisons more reliable.

### `GET /api/compare`

Compares a product across stores for a selected area.

Query parameters:

| Name | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `barcode` | string | yes | none | CHP product identifier. Can be empty for fallback lookup behavior. |
| `product_name` | string | yes | none | Product search/display value. |
| `city_id` | string | no | `0` | Selected city. |
| `street_id` | string | no | `0` | Selected street. |
| `from` | integer | no | `0` | Pagination offset passed through to CHP. |
| `num_results` | integer | no | `20` | Number of rows requested from CHP. |

Example:

```http
GET /api/compare?barcode=7290027600007_7290004127275&product_name=חלב%20תנובה&city_id=5000&street_id=9000&num_results=20
```

Response shape:

```json
{
  "product_name": "חלב תנובה טרי 3% בקרטון, 1 ליטר",
  "product_code": "7290027600007_7290004127275",
  "product_image_base64": "...",
  "physical_stores": [
    {
      "chain": "רמי לוי",
      "store_name": "רמת החייל",
      "address": "דבורה הנביאה 126, תל אביב",
      "website_url": "",
      "deal": "",
      "price": 7.2
    }
  ],
  "online_stores": [
    {
      "chain": "רמי לוי באינטרנט",
      "store_name": "רמי לוי באינטרנט",
      "address": "",
      "website_url": "https://www.rami-levy.co.il",
      "deal": "",
      "price": 7.2
    }
  ],
  "total_count": 159
}
```

If CHP returns no physical and no online stores, the API raises `404` with `No results`.

## Response Models

The scraper uses Pydantic models in `chp_wrapper/src/chp_wrapper/models.py`.

### `AddressSuggestion`

| Field | Type | Meaning |
| --- | --- | --- |
| `label` | string | Display label from CHP. |
| `value` | string | Search value from CHP. |
| `city_id` | string | CHP city identifier. |
| `street_id` | string | CHP street identifier. |

### `ProductSuggestion`

| Field | Type | Meaning |
| --- | --- | --- |
| `label` | string | Display label from CHP. |
| `value` | string | Product search value used for compare requests. |
| `barcode` | string | Opaque CHP product identifier. |
| `parts` | `ProductSuggestionPart` | Product metadata. |

### `ProductSuggestionPart`

| Field | Type | Meaning |
| --- | --- | --- |
| `name_and_contents` | string | Human-readable product name and content. |
| `manufacturer_and_barcode` | string | Manufacturer plus barcode text. |
| `pack_size` | string | Unit/pack size. |
| `small_image` | string | Base64 image. |
| `chainnames` | string | CHP chain metadata. |
| `price_range` | list of strings or null | Optional min/max price range. |

### `StoreOffer`

| Field | Type | Meaning |
| --- | --- | --- |
| `chain` | string | Chain name. |
| `store_name` | string | Store/site name. |
| `address` | string | Physical store address, empty for online offers. |
| `website_url` | string | Online store URL, empty for physical offers. |
| `deal` | string | Deal/discount text when available. |
| `price` | float | Current product price. |

### `CompareResult`

| Field | Type | Meaning |
| --- | --- | --- |
| `product_name` | string | Product name selected/displayed by CHP. |
| `product_code` | string | CHP product code from compare HTML. |
| `product_image_base64` | string | Product image when available. |
| `physical_stores` | list of `StoreOffer` | Physical store offers. |
| `online_stores` | list of `StoreOffer` | Online store offers. |
| `total_count` | integer | CHP total result count when available. |

## Scraper Package Features

### HTTP Client

`chp_wrapper/client.py` provides `ChpClient`:

- Uses `aiohttp.ClientSession` with `https://chp.co.il` as base URL.
- Sends browser-like `User-Agent`.
- Sends `X-Requested-With: XMLHttpRequest`.
- Sends `Referer: https://chp.co.il/`.
- Adds a stable random `u` parameter per client instance.

### Address Search

`chp_wrapper/address.py` calls CHP address autocomplete and maps the JSON response to `AddressSuggestion` objects.

### Product Search

`chp_wrapper/product.py` calls CHP extended product autocomplete and maps the JSON response to `ProductSuggestion` objects. It skips CHP navigation rows such as `prev` and `next`.

### Price Comparison

`chp_wrapper/compare.py` is the most complex scraper module. It calls `/main_page/compare_results`, receives HTML, parses product metadata, extracts physical and online result tables, and returns `CompareResult`.

## Compare HTML Deobfuscation

CHP comparison HTML can include random hidden decoy fragments inside store names, addresses, URLs, and prices. The scraper must extract only visible text.

The deobfuscator handles:

- Zero-width Unicode marks.
- Inline `<style>` blocks.
- CSS selectors like `[data-x="..."]`, `span[data-x="..."]`, `#id[data-x="..."]`, and `div#id[data-x="..."]`.
- CSS specificity and rule order.
- Broader hidden selectors through `soupsieve` when safe.
- Hidden inline styles such as `display:none` and `visibility:hidden`.
- Discount text stored in `button[data-discount-desc]`.

The current parser intentionally treats the external CHP HTML as hostile/noisy input. Store text, URLs, and prices are validated indirectly by live regression tests.

## Compare Fallback Behavior

Saved grocery-list items can become stale. A barcode saved in one location or at one time may not compare cleanly later. `compare()` therefore uses fallbacks:

1. Try the exact `barcode` and `product_name` first.
2. If no stores are found and `barcode` exists, retry with an empty barcode and the same product name.
3. Search products again in the current area.
4. Try up to the first three matching suggestions with their search terms.
5. Return the first result with any physical or online offers.

This fallback behavior is especially important for grocery-list basket comparison.

## Error Handling

| Case | Behavior |
| --- | --- |
| Client not initialized | `503 Client not initialized`. |
| Address/product query shorter than 2 chars | FastAPI validation error. |
| CHP request HTTP failure | Propagates from `aiohttp` through FastAPI as an error response. |
| Compare returns no stores | `404 No results`. |
| Product/store removed by CHP | Live tests warn when expected fixtures disappear. |

## Testing Strategy

Tests live in `tests/test_scraper_regressions.py` and can be run with:

```sh
python3 -m unittest discover
```

The suite contains two categories:

1. Synthetic parser regression tests for hidden decoy text and malformed price fragments.
2. Live scraper smoke tests for known Hebrew products and expected store combinations.

Live tests currently cover:

- `חלב תנובה 3%`
- `לחם אחיד`
- `ביצים`
- `קוטג`

They assert that responses have sane store names, URLs, addresses, counts, and prices. If CHP changes product/store availability, tests emit warnings for fixture drift rather than failing only because a known product disappeared.

## Operational Notes

- Prices are volatile and should not be hard-coded in tests or UI assumptions.
- Store availability can differ by `city_id` and `street_id`.
- Vercel Hobby functions are limited to 10 seconds, so slow CHP responses can cause timeouts.
- The API is currently open with permissive CORS because it is only a thin wrapper around public CHP data.
- There is no backend persistence; grocery lists are browser-local only.

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): frontend architecture, state flow, basket aggregation, deployment, and validation commands.
