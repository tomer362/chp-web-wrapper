import json
from typing import Optional
from .client import ChpClient
from .models import ProductSuggestion, ProductSuggestionPart


async def search_product(
    client: ChpClient,
    query: str,
    city_id: str = "0",
    street_id: str = "0",
    from_: int = 0,
) -> list[ProductSuggestion]:
    raw = await client.request(
        "/autocompletion/product_extended",
        {
            "term": query,
            "from": str(from_),
            "shopping_address": "",
            "shopping_address_city_id": city_id,
            "shopping_address_street_id": street_id,
        },
    )
    data = json.loads(raw)
    results: list[ProductSuggestion] = []
    for item in data:
        if item.get("id") in ("prev", "next"):
            continue
        parts_data = item.get("parts") or {}
        results.append(
            ProductSuggestion(
                label=item["label"],
                value=item["value"],
                barcode=item["id"],
                parts=ProductSuggestionPart(**parts_data),
            )
        )
    return results
