import re
from typing import Optional
from bs4 import BeautifulSoup, Tag, NavigableString
import soupsieve as sv
from .client import ChpClient
from .models import CompareResult, StoreOffer
from .product import search_product

_ZERO_WIDTH_CHARS = re.compile(r"[\u200b\u200c\u200d\u200e\u200f]")


def _strip_zw(text: str) -> str:
    return _ZERO_WIDTH_CHARS.sub("", text)


def _css_selector_to_rule(selector: str, props: str) -> Optional[dict]:
    selector = selector.strip()
    props = props.strip()
    normalized_props = props.replace(" ", "").lower()
    hidden = "display:none" in normalized_props or "visibility:hidden" in normalized_props

    base_rule = {"selector": selector, "hidden": hidden}

    # CHP injects decoy letters into result cells and hides them with CSS such as
    # [data-x="abc"] { display: none }. Parse only those visibility rules and
    # apply them recursively when extracting cell text.
    data_attr = r"[\w-]+"
    data_value = r"[^\"\']+"

    # Pattern: #ID[data-ATTR="VALUE"]
    m = re.match(
        rf'^#([\w-]+)\[data-({data_attr})=["\']({data_value})["\']\]$', selector, re.I
    )
    if m:
        return {
            "tag": None,
            "attr_name": f"data-{m.group(2)}".lower(),
            "attr_value": m.group(3),
            "has_id": m.group(1),
            "display_none": hidden,
            **base_rule,
            "specificity": 3,
        }

    # Pattern: tag[data-ATTR="VALUE"]
    m = re.match(
        rf'^([\w-]+)\[data-({data_attr})=["\']({data_value})["\']\]$', selector, re.I
    )
    if m:
        return {
            "tag": m.group(1).lower(),
            "attr_name": f"data-{m.group(2)}".lower(),
            "attr_value": m.group(3),
            "has_id": None,
            "display_none": hidden,
            **base_rule,
            "specificity": 2,
        }

    # Pattern: [data-ATTR="VALUE"]
    m = re.match(
        rf'^\[data-({data_attr})=["\']({data_value})["\']\]$', selector, re.I
    )
    if m:
        return {
            "tag": None,
            "attr_name": f"data-{m.group(1)}".lower(),
            "attr_value": m.group(2),
            "has_id": None,
            "display_none": hidden,
            **base_rule,
            "specificity": 1,
        }

    # Keep broader display/visibility hiding selectors even when they are not
    # one of CHP's older data-attribute obfuscation patterns. The compare page
    # often hides decoy Latin letters inside Hebrew names with class selectors,
    # so selector matching is required to avoid corrupting RTL text.
    if hidden:
        return {**base_rule, "specificity": 0}

    return None


def _parse_css_rules(html: str) -> list[dict]:
    rules = []
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.DOTALL | re.I):
        css_text = m.group(1)
        for rule_text in re.finditer(r"([^{}]+)\{([^}]+)\}", css_text):
            for selector in rule_text.group(1).split(","):
                rule = _css_selector_to_rule(selector, rule_text.group(2))
                if rule:
                    rules.append(rule)
    return rules


def _element_visible(
    tag: str, attrs: dict, el_id: Optional[str], rules: list[dict]
) -> bool:
    tag = tag.lower()
    matching = []
    for rule in rules:
        if "attr_name" not in rule or "attr_value" not in rule:
            continue
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


def _data_attrs(tag: Tag) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for key, val in tag.attrs.items():
        if key.lower().startswith("data-"):
            attrs[key.lower()] = " ".join(val) if isinstance(val, list) else str(val)
    return attrs


def _has_hidden_inline_style(node: Tag) -> bool:
    style = node.get("style", "")
    if not isinstance(style, str):
        return False
    normalized = style.replace(" ", "").lower()
    return "display:none" in normalized or "visibility:hidden" in normalized


def _matches_hidden_selector(node: Tag, rules: list[dict]) -> bool:
    for rule in rules:
        if not rule.get("hidden") or not rule.get("selector"):
            continue
        try:
            if sv.match(rule["selector"], node):
                return True
        except Exception:
            continue
    return False


def _extract_visible_text(node: Tag | NavigableString, rules: list[dict]) -> str:
    if isinstance(node, NavigableString):
        return _strip_zw(str(node))

    if node.name in {"script", "style"}:
        return ""

    if _has_hidden_inline_style(node) or _matches_hidden_selector(node, rules):
        return ""

    if not _element_visible(node.name, _data_attrs(node), node.get("id"), rules):
        return ""

    return "".join(_extract_visible_text(child, rules) for child in node.children)


def _extract_cell_text(cell: Tag, rules: list[dict]) -> str:
    return _extract_visible_text(cell, rules).strip()


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


async def _compare_once(
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


def _has_offers(result: CompareResult) -> bool:
    return bool(result.physical_stores or result.online_stores)


async def compare(
    client: ChpClient,
    barcode: str,
    product_name: str,
    city_id: str = "0",
    street_id: str = "0",
    from_: int = 0,
    num_results: int = 20,
) -> CompareResult:
    result = await _compare_once(
        client,
        barcode=barcode,
        product_name=product_name,
        city_id=city_id,
        street_id=street_id,
        from_=from_,
        num_results=num_results,
    )
    if _has_offers(result):
        return result

    # A saved grocery-list item can outlive the location in which it was added.
    # When CHP rejects the stored barcode for the new shopping area, retry by
    # name and then with the first matching barcode from the current area.
    tried_barcodes = {barcode}
    if barcode:
        result = await _compare_once(
            client,
            barcode="",
            product_name=product_name,
            city_id=city_id,
            street_id=street_id,
            from_=from_,
            num_results=num_results,
        )
        if _has_offers(result):
            return result
        tried_barcodes.add("")

    suggestions = await search_product(client, product_name, city_id, street_id)
    for suggestion in suggestions[:3]:
        if suggestion.barcode in tried_barcodes:
            continue
        result = await _compare_once(
            client,
            barcode=suggestion.barcode,
            product_name=suggestion.parts.name_and_contents or suggestion.value or product_name,
            city_id=city_id,
            street_id=street_id,
            from_=from_,
            num_results=num_results,
        )
        if _has_offers(result):
            return result
        tried_barcodes.add(suggestion.barcode)

    return result
