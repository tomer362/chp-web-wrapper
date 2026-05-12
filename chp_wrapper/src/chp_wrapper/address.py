import json
from typing import Optional
from .client import ChpClient
from .models import AddressSuggestion


async def search_address(client: ChpClient, query: str, from_: int = 0) -> list[AddressSuggestion]:
    raw = await client.request(
        "/autocompletion/shopping_address",
        {"term": query, "from": str(from_)},
    )
    data = json.loads(raw)
    results: list[AddressSuggestion] = []
    for item in data:
        if item.get("id") in ("prev", "next"):
            continue
        parts = item["id"].split("_", 1)
        results.append(
            AddressSuggestion(
                label=item["label"],
                value=item["value"],
                city_id=parts[0],
                street_id=parts[1] if len(parts) > 1 else "0",
            )
        )
    return results
