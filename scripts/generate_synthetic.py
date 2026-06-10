import json
import random
import string
from pathlib import Path

def generate_synthetic():
    root = Path(__file__).resolve().parents[1]
    catalog_file = root / "out" / "api" / "products.json"
    
    if not catalog_file.exists():
        print(f"Catalog file not found at {catalog_file}")
        return

    with open(catalog_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    original_products = data.get("products", [])
    if not original_products:
        print("No products found in catalog.")
        return

    # Add stock=100 to originals
    for p in original_products:
        p["stock"] = 100
        p["in_stock"] = True

    current_count = len(original_products)
    needed = max(0, 100 - current_count)
    
    new_products = list(original_products)
    
    for i in range(needed):
        base_product = random.choice(original_products)
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
        
        new_p = dict(base_product)
        new_p["id"] = f"{base_product['id']}-var-{suffix}"
        new_p["handle"] = f"{base_product['handle']}-var-{suffix}"
        new_p["title"] = f"{base_product['title']} (Variant {suffix.upper()})"
        new_p["name"] = new_p["title"]
        new_p["url"] = f"{base_product['url']}var-{suffix}/"
        new_p["stock"] = 100
        new_p["in_stock"] = True
        
        new_products.append(new_p)
        
    data["products"] = new_products
    data["count"] = len(new_products)

    with open(catalog_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Synthetically generated products. Total products now: {len(new_products)}.")

if __name__ == "__main__":
    generate_synthetic()
