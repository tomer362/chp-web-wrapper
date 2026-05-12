from fastapi import FastAPI, Query, HTTPException
from typing import Optional
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from chp_wrapper.client import ChpClient
from chp_wrapper.address import search_address
from chp_wrapper.product import search_product
from chp_wrapper.compare import compare


client: Optional[ChpClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = ChpClient()
    yield
    await client.close()


app = FastAPI(title="chp.wrapper", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_client() -> ChpClient:
    if client is None:
        raise HTTPException(503, "Client not initialized")
    return client


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/addresses")
async def api_search_address(
    q: str = Query(min_length=2),
    from_: int = Query(0, alias="from"),
):
    c = _get_client()
    results = await search_address(c, q, from_)
    return results


@app.get("/api/products")
async def api_search_product(
    q: str = Query(min_length=2),
    city_id: str = "0",
    street_id: str = "0",
    from_: int = Query(0, alias="from"),
):
    c = _get_client()
    results = await search_product(c, q, city_id, street_id, from_)
    return results


@app.get("/api/compare")
async def api_compare(
    barcode: str,
    product_name: str,
    city_id: str = "0",
    street_id: str = "0",
    from_: int = Query(0, alias="from"),
    num_results: int = Query(20, alias="num_results"),
):
    c = _get_client()
    result = await compare(
        c,
        barcode=barcode,
        product_name=product_name,
        city_id=city_id,
        street_id=street_id,
        from_=from_,
        num_results=num_results,
    )
    if not result.physical_stores and not result.online_stores:
        raise HTTPException(404, "No results found")
    return result


def run():
    import uvicorn
    uvicorn.run("chp_wrapper.api.main:app", host="0.0.0.0", port=8000, reload=True)
