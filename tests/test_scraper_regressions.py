import asyncio
import math
import re
import sys
import unittest
import warnings
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "chp_wrapper" / "src"))

from chp_wrapper.client import ChpClient
from chp_wrapper.compare import _extract_cell_text, _parse_css_rules, compare
from chp_wrapper.product import search_product


CITY_ID = "5000"
STREET_ID = "9000"
MAX_REASONABLE_GROCERY_PRICE = 500

LIVE_PRODUCT_CASES = [
    {
        "query": "חלב תנובה 3%",
        "expected_product": "חלב תנובה",
        "expected_hosts": {"rami-levy.co.il", "shufersal.co.il", "carrefour.co.il"},
    },
    {
        "query": "לחם אחיד",
        "expected_product": "לחם אחיד",
        "expected_hosts": {"rami-levy.co.il", "mck.co.il", "carrefour.co.il"},
    },
    {
        "query": "ביצים",
        "expected_product": "ביצים",
        "expected_hosts": {"rami-levy.co.il", "shufersal.co.il", "carrefour.co.il"},
    },
    {
        "query": "קוטג",
        "expected_product": "קוטג",
        "expected_hosts": {"rami-levy.co.il", "shufersal.co.il", "carrefour.co.il"},
    },
]


def _warn_changed_fixture(message: str) -> None:
    warnings.warn(message, RuntimeWarning, stacklevel=2)


def _host(url: str) -> str:
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    return parsed.hostname.replace("www.", "") if parsed.hostname else ""


def _contains_hebrew(text: str) -> bool:
    return bool(re.search(r"[\u0590-\u05ff]", text))


def _has_unexpected_latin_noise(text: str) -> bool:
    allowed = text
    for token in ("Carrefour", "city", "AM", "PM", "T.L.V", "local"):
        allowed = allowed.replace(token, "")
    return bool(re.search(r"[A-Za-z]", allowed))


def _single_spaced(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


class ScraperParserRegressionTest(unittest.TestCase):
    def test_extract_cell_text_ignores_hidden_decoys_and_respects_specificity(self) -> None:
        html = """
        <style>
          [data-noise="x"] { display: none; }
          span[data-visible="yes"] { display: inline; }
          div#hidden-piece[data-piece="hidden-piece"] { display: none; }
          [data-price-noise="dot"] { display: none; }
        </style>
        <td id="store">
          <span data-visible="yes">רמי</span><span data-noise="x">Ab7</span>
          <span data-visible="yes"> לוי</span><div id="hidden-piece" data-piece="hidden-piece">ZZ</div>
        </td>
        <td id="price">
          <span>14</span><span data-price-noise="dot">.9</span><span>.</span><span>20</span>
        </td>
        """
        soup = BeautifulSoup(html, "lxml")
        rules = _parse_css_rules(html)

        self.assertEqual(_single_spaced(_extract_cell_text(soup.find("td", id="store"), rules)), "רמי לוי")
        self.assertEqual(_extract_cell_text(soup.find("td", id="price"), rules), "14.20")


class LiveScraperRegressionTest(unittest.TestCase):
    def test_known_complex_products_return_sane_store_combinations(self) -> None:
        asyncio.run(self._run_live_cases())

    async def _run_live_cases(self) -> None:
        client = ChpClient()
        try:
            for case in LIVE_PRODUCT_CASES:
                with self.subTest(query=case["query"]):
                    suggestions = await search_product(client, case["query"], CITY_ID, STREET_ID)
                    if not suggestions:
                        _warn_changed_fixture(f"No product suggestions for {case['query']!r}; CHP data may have changed")
                        continue

                    product = next(
                        (suggestion for suggestion in suggestions if case["expected_product"] in suggestion.value),
                        suggestions[0],
                    )
                    if case["expected_product"] not in product.value:
                        _warn_changed_fixture(
                            f"Expected product text {case['expected_product']!r} not in first matched suggestion {product.value!r}"
                        )

                    result = await compare(
                        client,
                        product.barcode,
                        product.value,
                        CITY_ID,
                        STREET_ID,
                        num_results=20,
                    )
                    if not result.online_stores and not result.physical_stores:
                        _warn_changed_fixture(f"No compare results for {product.value!r}; CHP availability may have changed")
                        continue

                    self.assertGreaterEqual(len(result.online_stores), 3)
                    self.assertGreaterEqual(len(result.physical_stores), 10)
                    self.assertIn(case["expected_product"], result.product_name)

                    observed_hosts = {_host(store.website_url) for store in result.online_stores if store.website_url}
                    missing_hosts = case["expected_hosts"] - observed_hosts
                    if missing_hosts:
                        _warn_changed_fixture(
                            f"Expected online stores missing for {product.value!r}: {sorted(missing_hosts)}; store data may have changed"
                        )

                    self._assert_sane_online_offers(result.online_stores[:8])
                    self._assert_sane_physical_offers(result.physical_stores[:12])
        finally:
            await client.close()

    def _assert_sane_online_offers(self, stores) -> None:
        for store in stores:
            with self.subTest(online_store=f"{store.chain} / {store.store_name}"):
                self._assert_sane_store_text(store.chain)
                self._assert_sane_store_text(store.store_name)
                self.assertTrue(store.website_url.startswith(("http://", "https://")), store.website_url)
                self.assertIn(".", _host(store.website_url), store.website_url)
                self._assert_sane_price(store.price)

    def _assert_sane_physical_offers(self, stores) -> None:
        for store in stores:
            with self.subTest(physical_store=f"{store.chain} / {store.store_name}"):
                self._assert_sane_store_text(store.chain)
                self._assert_sane_store_text(store.store_name)
                self.assertTrue(_contains_hebrew(store.address), store.address)
                self._assert_sane_price(store.price)

    def _assert_sane_store_text(self, text: str) -> None:
        self.assertTrue(text.strip(), "empty store text")
        self.assertFalse(_has_unexpected_latin_noise(text), f"unexpected Latin noise in {text!r}")

    def _assert_sane_price(self, price: float) -> None:
        self.assertTrue(math.isfinite(price), price)
        self.assertGreater(price, 0)
        self.assertLess(price, MAX_REASONABLE_GROCERY_PRICE)


if __name__ == "__main__":
    unittest.main()
