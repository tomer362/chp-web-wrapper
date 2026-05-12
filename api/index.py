import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "chp_wrapper" / "src"))

from chp_wrapper.client import ChpClient
from chp_wrapper.address import search_address
from chp_wrapper.product import search_product
from chp_wrapper.compare import compare
from chp_wrapper.models import AddressSuggestion, ProductSuggestion, CompareResult

from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

client: Optional[ChpClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = ChpClient()
    yield
    await client.close()


app = FastAPI(title="chp.web.wrapper", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


def _client() -> ChpClient:
    if client is None:
        raise HTTPException(503, "Client not initialized")
    return client


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/addresses")
async def api_addresses(q: str = Query(min_length=2), from_: int = Query(0, alias="from")):
    return await search_address(_client(), q, from_)


@app.get("/api/products")
async def api_products(q: str = Query(min_length=2), city_id: str = "0", street_id: str = "0", from_: int = Query(0, alias="from")):
    return await search_product(_client(), q, city_id, street_id, from_)


@app.get("/api/compare")
async def api_compare(barcode: str, product_name: str, city_id: str = "0", street_id: str = "0", from_: int = Query(0, alias="from"), num_results: int = Query(20)):
    r = await compare(_client(), barcode, product_name, city_id, street_id, from_, num_results)
    if not r.physical_stores and not r.online_stores:
        raise HTTPException(404, "No results")
    return r
