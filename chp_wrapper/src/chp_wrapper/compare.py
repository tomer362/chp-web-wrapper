import re
from typing import Optional
from bs4 import BeautifulSoup, Tag, NavigableString
from .client import ChpClient
from .models import CompareResult, StoreOffer

_ZERO_WIDTH_CHARS = re.compile(r"[\u200b\u200c\u200d\u200e\u200f]")


def _strip_zw(text: str) -> str:
    return _ZERO_WIDTH_CHARS.sub("", text)


def _css_selector_to_rule(selector: str, props: str) -> Optional[dict]:
    selector = selector.strip()
    props = props.strip()
    display_none = "display:none" in props.replace(" ", "")

    # Pattern: #ID[data-ATTR="VALUE"]
    m = re.match(
        r'^#(\w+)\[data-(\w+)="(\w+)"\]$', selector, re.I
    )
    if m:
        return {
            "tag": None,
            "attr_name": f"data-{m.group(2)}".lower(),
            "attr_value": m.group(3),
            "has_id": m.group(1),
            "display_none": display_none,
            "specificity": 3,
        }

    # Pattern: tag[data-ATTR="VALUE"]
    m = re.match(
        r'^(\w+)\[data-(\w+)="(\w+)"\]$', selector, re.I
    )
    if m:
        return {
            "tag": m.group(1).lower(),
            "attr_name": f"data-{m.group(2)}".lower(),
            "attr_value": m.group(3),
            "has_id": None,
            "display_none": display_none,
            "specificity": 2,
        }

    # Pattern: [data-ATTR="VALUE"]
    m = re.match(
        r'^\[data-(\w+)="(\w+)"\]$', selector, re.I
    )
    if m:
        return {
            "tag": None,
            "attr_name": f"data-{m.group(1)}".lower(),
            "attr_value": m.group(2),
            "has_id": None,
            "display_none": display_none,
            "specificity": 1,
        }

    return None


def _parse_css_rules(html: str) -> list[dict]:
    rules = []
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.DOTALL | re.I):
        css_text = m.group(1)
        for rule_text in re.finditer(r"([^{]+)\{([^}]+)\}", css_text):
            rule = _css_selector_to_rule(rule_text.group(1), rule_text.group(2))
            if rule:
                rules.append(rule)
    return rules


def _element_visible(
    tag: str, attrs: dict, el_id: Optional[str], rules: list[dict]
) -> bool:
    tag = tag.lower()
    matching = []
    for rule in rules:
        if rule["attr_value"] != attrs.get(rule["attr_name"]):
            continue
        if rule["has_id"] is not None and rule["has_id"] != el_id:
            continue
        if rule["tag"] is not None and rule["tag"] != tag:
            continue
        matching.append(rule)

    if not matching:
        return True

    best = max(matching, key=lambda r: r["specificity"])
    return not best["display_none"]


def _extract_cell_text(cell: Tag, rules: list[dict]) -> str:
    parts: list[str] = []
    for node in cell.children:
        if isinstance(node, NavigableString):
            parts.append(_strip_zw(str(node)))
        elif isinstance(node, Tag):
            el_id = node.get("id")
            el_attrs = {}
            for key, val in node.attrs.items():
                if key.lower().startswith("data-"):
                    el_attrs[key.lower()] = val
            if _element_visible(node.name, el_attrs, el_id, rules):
                text = _strip_zw(node.get_text())
                if text:
                    parts.append(text)
    return "".join(parts).strip()


def _clean_url(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9:/._\-~]", "", text)
    return text


def _parse_price(text: str) -> float:
    text = text.replace("₪", "").replace(",", ".").strip()
    text = re.sub(r"[^\d.]", "", text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def _extract_deal(cell: Tag) -> str:
    btn = cell.find("button", attrs={"data-discount-desc": True})
    if btn:
        desc = btn.get("data-discount-desc", "")
        desc = desc.replace("&lt;BR&gt;", " | ").replace("<BR>", " | ").replace("<br>", " | ")
        desc = _strip_zw(desc).strip()
        return desc
    return ""


def _parse_offers_table(
    table: Tag, rules: list[dict], is_online: bool
) -> list[StoreOffer]:
    rows = table.find_all("tr")
    offers: list[StoreOffer] = []
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        row_cls = " ".join(row.get("class", []))
        if "display_when_narrow" in row_cls:
            continue
        raw_chain = _extract_cell_text(cells[0], rules) if len(cells) > 0 else ""
        raw_store = _extract_cell_text(cells[1], rules) if len(cells) > 1 else ""

        address_or_url = _extract_cell_text(cells[2], rules) if len(cells) > 2 else ""
        if is_online:
            website_url = _clean_url(address_or_url)
            address = ""
        else:
            address = address_or_url
            website_url = ""

        deal = _extract_deal(cells[3]) if len(cells) > 3 else ""
        if not deal:
            deal = _extract_cell_text(cells[3], rules) if len(cells) > 3 else ""
        price_raw = _extract_cell_text(cells[4], rules) if len(cells) > 4 else ""

        chain = _strip_zw(raw_chain).strip()
        store_name = _strip_zw(raw_store).strip()
        deal = _strip_zw(deal).strip()
        price = _parse_price(price_raw)

        if not chain and not store_name:
            continue

        offers.append(
            StoreOffer(
                chain=chain,
                store_name=store_name,
                address=address,
                website_url=website_url,
                deal=deal,
                price=price,
            )
        )
    return offers


async def compare(
    client: ChpClient,
    barcode: str,
    product_name: str,
    city_id: str = "0",
    street_id: str = "0",
    from_: int = 0,
    num_results: int = 20,
) -> CompareResult:
    raw = await client.request(
        "/main_page/compare_results",
        {
            "product_barcode": barcode,
            "product_name_or_barcode": product_name,
            "shopping_address": "",
            "shopping_address_city_id": city_id,
            "shopping_address_street_id": street_id,
            "from": str(from_),
            "num_results": str(num_results),
        },
    )

    rules = _parse_css_rules(raw)
    soup = BeautifulSoup(raw, "lxml")

    product_code = ""
    product_name_display = ""
    product_image = ""

    pc = soup.find("input", {"id": "displayed_product_code"})
    if pc:
        product_code = pc.get("value", "")
    pn = soup.find("input", {"id": "displayed_product_name_and_contents"})
    if pn:
        product_name_display = pn.get("value", "")

    img = soup.find("img", {"data-uri": True})
    if img:
        product_image = img.get("data-uri", "")

    tables = soup.find_all("table", class_="results-table")
    physical: list[StoreOffer] = []
    online: list[StoreOffer] = []

    if len(tables) > 0:
        physical = _parse_offers_table(tables[0], rules, is_online=False)
    if len(tables) > 1:
        online = _parse_offers_table(tables[1], rules, is_online=True)

    total_count = 0
    if tables:
        total_str = tables[0].get("data-product_search_total_num_results", "0")
        try:
            total_count = int(total_str)
        except ValueError:
            total_count = len(physical) + len(online)

    return CompareResult(
        product_name=product_name_display or product_name,
        product_code=product_code,
        product_image_base64=product_image,
        physical_stores=physical,
        online_stores=online,
        total_count=total_count,
    )
