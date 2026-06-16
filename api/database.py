import sqlite3
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

# Constants
DB_DIR: Path = Path(__file__).resolve().parents[1] / "out" / "api"
DB_PATH: Path = DB_DIR / "storefront.sqlite"
JSON_CATALOG_PATH: Path = DB_DIR / "products.json"


def get_connection() -> sqlite3.Connection:
    """Returns a new database connection with row factory configured."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initializes the database schema and optionally migrates JSON data."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id TEXT PRIMARY KEY,
                    handle TEXT NOT NULL,
                    title TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category TEXT NOT NULL,
                    categories TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    vendor TEXT NOT NULL,
                    price REAL NOT NULL,
                    original_price REAL,
                    currency TEXT NOT NULL,
                    stock INTEGER NOT NULL,
                    in_stock BOOLEAN NOT NULL,
                    image_url TEXT NOT NULL,
                    url TEXT NOT NULL
                )
            """)
            conn.commit()
            
            # Check if migration is needed
            cursor.execute("SELECT COUNT(*) as cnt FROM products")
            row: sqlite3.Row = cursor.fetchone()
            if row["cnt"] == 0:
                _migrate_from_json(conn)
    except sqlite3.Error as e:
        logging.error(f"Database initialization failed: {e}")
        raise


def _migrate_from_json(conn: sqlite3.Connection) -> None:
    """Internal helper to migrate products from products.json to SQLite if it exists."""
    if not JSON_CATALOG_PATH.is_file():
        return
    
    try:
        with open(JSON_CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog: Dict[str, Any] = json.load(f)
            products: List[Dict[str, Any]] = catalog.get("products", [])
            for product in products:
                upsert_product(product, conn=conn)
    except (json.JSONDecodeError, OSError) as e:
        logging.error(f"Failed to read products.json during migration: {e}")


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert sqlite3.Row to a standard dictionary with JSON parsing."""
    result: Dict[str, Any] = dict(row)
    # Parse back the categories JSON array
    try:
        result["categories"] = json.loads(result["categories"])
    except json.JSONDecodeError:
        result["categories"] = [result["category"]]
    result["in_stock"] = bool(result["in_stock"])
    return result


def get_all_products() -> List[Dict[str, Any]]:
    """Retrieves all products from the database, ordered by name."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM products ORDER BY name ASC")
            rows: List[sqlite3.Row] = cursor.fetchall()
            return [_row_to_dict(row) for row in rows]
    except sqlite3.Error as e:
        logging.error(f"Failed to fetch products: {e}")
        return []


def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single product by ID or handle."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM products WHERE id = ? OR handle = ?",
                (product_id, product_id)
            )
            row: Optional[sqlite3.Row] = cursor.fetchone()
            return _row_to_dict(row) if row else None
    except sqlite3.Error as e:
        logging.error(f"Failed to fetch product {product_id}: {e}")
        return None


def upsert_product(product: Dict[str, Any], conn: Optional[sqlite3.Connection] = None) -> None:
    """Inserts or updates a product in the database."""
    manage_conn: bool = conn is None
    connection: sqlite3.Connection = conn or get_connection()
    
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO products (
                id, handle, title, name, description, category, categories,
                brand, vendor, price, original_price, currency, stock,
                in_stock, image_url, url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                handle=excluded.handle,
                title=excluded.title,
                name=excluded.name,
                description=excluded.description,
                category=excluded.category,
                categories=excluded.categories,
                brand=excluded.brand,
                vendor=excluded.vendor,
                price=excluded.price,
                original_price=excluded.original_price,
                currency=excluded.currency,
                stock=excluded.stock,
                in_stock=excluded.in_stock,
                image_url=excluded.image_url,
                url=excluded.url
            """,
            (
                str(product.get("id")),
                str(product.get("handle")),
                str(product.get("title")),
                str(product.get("name")),
                str(product.get("description", "")),
                str(product.get("category", "")),
                json.dumps(product.get("categories", [])),
                str(product.get("brand", "")),
                str(product.get("vendor", "")),
                float(product.get("price") or 0.0),
                product.get("original_price"),
                str(product.get("currency") or "USD"),
                int(product.get("stock") or 0),
                bool(product.get("in_stock") or False),
                str(product.get("image_url") or ""),
                str(product.get("url") or "")
            )
        )
        if manage_conn:
            connection.commit()
    except sqlite3.Error as e:
        logging.error(f"Failed to upsert product {product.get('id')}: {e}")
        if manage_conn:
            connection.rollback()
        raise
    finally:
        if manage_conn:
            connection.close()


def delete_product(product_id: str) -> None:
    """Deletes a product by ID or handle."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM products WHERE id = ? OR handle = ?", (product_id, product_id))
            conn.commit()
    except sqlite3.Error as e:
        logging.error(f"Failed to delete product {product_id}: {e}")
        raise


def replenish_stock(stock_amount: int = 100) -> None:
    """Replenishes the stock of all products to a specified amount."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE products SET stock = ?, in_stock = 1",
                (stock_amount,)
            )
            conn.commit()
    except sqlite3.Error as e:
        logging.error(f"Failed to replenish stock: {e}")
        raise
