from pydantic import BaseModel, Field
from typing import Optional


class AddressSuggestion(BaseModel):
    label: str
    value: str
    city_id: str = Field(alias="city_id")
    street_id: str = Field(alias="street_id")


class ProductSuggestionPart(BaseModel):
    name_and_contents: str = ""
    manufacturer_and_barcode: str = ""
    pack_size: str = ""
    small_image: str = ""
    chainnames: str = ""
    price_range: Optional[list[str]] = None


class ProductSuggestion(BaseModel):
    label: str
    value: str
    barcode: str
    parts: ProductSuggestionPart


class StoreOffer(BaseModel):
    chain: str
    store_name: str
    address: str = ""
    website_url: str = ""
    deal: str = ""
    price: float = 0.0


class CompareResult(BaseModel):
    product_name: str
    product_code: str
    product_image_base64: str = ""
    physical_stores: list[StoreOffer] = Field(default_factory=list)
    online_stores: list[StoreOffer] = Field(default_factory=list)
    total_count: int = 0
