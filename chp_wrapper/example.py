import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from chp_wrapper.client import ChpClient
from chp_wrapper.address import search_address
from chp_wrapper.product import search_product
from chp_wrapper.compare import compare


async def main():
    async with ChpClient() as client:
        print("=== Step 1: Search for address 'תל' ===")
        addresses = await search_address(client, "תל")
        for a in addresses[:5]:
            print(f"  {a.label} -> city={a.city_id}, street={a.street_id}")

        if not addresses:
            print("  No addresses found")
            return

        city_id = addresses[0].city_id
        street_id = addresses[0].street_id
        print(f"\nUsing city_id={city_id}, street_id={street_id}\n")

        print("=== Step 2: Search for product 'חלב' ===")
        products = await search_product(client, "חלב", city_id, street_id)
        for p in products[:3]:
            print(f"  {p.label} -> barcode={p.barcode}")

        if not products:
            print("  No products found")
            return

        product = products[0]

        print(f"\n=== Step 3: Compare prices for '{product.label}' ===")
        result = await compare(
            client,
            barcode=product.barcode,
            product_name=product.value,
            city_id=city_id,
            street_id=street_id,
            num_results=5,
        )

        print(f"  Product: {result.product_name}")
        print(f"  Code: {result.product_code}")
        print(f"  Total offers: {result.total_count}")
        print(f"  Has image: {bool(result.product_image_base64)}")

        print(f"\n  Physical stores ({len(result.physical_stores)}):")
        for s in result.physical_stores[:5]:
            print(f"    {s.chain} - {s.store_name}")
            print(f"      Address: {s.address}")
            print(f"      Deal: {s.deal}")
            print(f"      Price: {s.price}")

        print(f"\n  Online stores ({len(result.online_stores)}):")
        for s in result.online_stores[:5]:
            print(f"    {s.chain} - {s.store_name}")
            print(f"      URL: {s.website_url}")
            print(f"      Deal: {s.deal}")
            print(f"      Price: {s.price}")


if __name__ == "__main__":
    asyncio.run(main())
