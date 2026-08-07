"""What the storefront's own search must find, and must not find.

Two defects are pinned here.

Fragment matching (local, 2026-08-05): searching "ipod" returned five camera
lenses, because the query was matched anywhere inside any field and the
subcategory "Lenses & Tripods" contains the letters "ipod".

Phrase matching (local, 2026-08-07): searching "samsung smartphones" returned
nothing, although "samsung" alone returned 21 products and "smartphones" alone
returned 53. The brand and the subcategory live in different columns and the
whole phrase was matched against each column on its own, so no row could
satisfy it. A shopper naturally describes one product with words this catalog
keeps apart, so the search has to combine them: every token must be found, and
each token may be found in any field.

The catalog below is a fixture. Brand and category names appear here and never
in the repository, which knows only about columns.
"""

from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.models import Base, Product
from app.repositories.product_repository import ProductRepository

CATALOG = [
    dict(
        id="p-galaxy",
        name="Samsung Galaxy S26 Ultra",
        subcategory="Electronics > Smartphones > Android Flagship",
        brand="Samsung",
        tags=["5g", "amoled"],
    ),
    dict(
        id="p-galaxy-a",
        name="Samsung Galaxy A18",
        subcategory="Electronics > Smartphones > Android Budget",
        brand="Samsung",
        tags=["5g"],
    ),
    dict(
        id="p-iphone",
        name="Apple iPhone 18 Pro",
        subcategory="Electronics > Smartphones > iOS Flagship",
        brand="Apple",
        tags=["ios"],
    ),
    dict(
        id="p-charger",
        name="Samsung Fast Charger 45W",
        subcategory="Electronics > Chargers",
        brand="Samsung",
        tags=["usb-c"],
    ),
    dict(
        id="p-tripod",
        name="NOVA Traveller Tripod",
        subcategory="Photography > Lenses & Tripods",
        brand="NOVA",
        tags=["aluminium"],
    ),
    dict(
        id="p-deskphone",
        name="NOVA Daily Phone",
        subcategory="Electronics > Landline",
        brand="NOVA",
        tags=["corded"],
    ),
]


def _rows() -> list[Product]:
    return [
        Product(
            id=item["id"],
            handle=item["id"],
            title=item["name"],
            name=item["name"],
            description=f"{item['name']} from {item['brand']}.",
            category=item["subcategory"].split(">")[0].strip(),
            subcategory=item["subcategory"],
            brand=item["brand"],
            vendor=item["brand"],
            tags=item["tags"],
        )
        for item in CATALOG
    ]


class SearchExecutionTests(unittest.TestCase):
    """The predicate is run against a real database, not just inspected."""

    def _found(self, term: str) -> set[str]:
        async def run() -> set[str]:
            engine = create_async_engine("sqlite+aiosqlite:///:memory:")
            try:
                async with engine.begin() as connection:
                    await connection.run_sync(Base.metadata.create_all)
                maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
                async with maker() as session:
                    session.add_all(_rows())
                    await session.commit()
                    repository = ProductRepository(session)
                    stmt = select(Product).where(repository._search_predicate(term))
                    result = await session.execute(stmt)
                    return {product.id for product in result.scalars().all()}
            finally:
                await engine.dispose()

        return asyncio.run(run())

    def test_brand_and_family_in_separate_columns_are_found_together(self) -> None:
        # The reported defect: this returned nothing on the live catalog.
        self.assertEqual({"p-galaxy", "p-galaxy-a"}, self._found("samsung smartphones"))

    def test_another_brand_narrows_to_its_own_products(self) -> None:
        self.assertEqual({"p-iphone"}, self._found("apple smartphones"))

    def test_each_word_alone_stays_broader_than_both_together(self) -> None:
        both_words = self._found("samsung smartphones")
        self.assertLess(len(both_words), len(self._found("samsung")))
        self.assertLess(len(both_words), len(self._found("smartphones")))

    def test_a_singular_query_finds_the_plural_family(self) -> None:
        self.assertEqual({"p-galaxy", "p-galaxy-a", "p-iphone"}, self._found("smartphone"))

    def test_a_plural_query_finds_a_singular_name(self) -> None:
        # "phones" must reach "NOVA Daily Phone" without reaching "Smartphones",
        # which is a different word that merely ends the same way.
        self.assertEqual({"p-deskphone"}, self._found("phones"))

    def test_a_word_is_never_matched_inside_a_longer_word(self) -> None:
        self.assertEqual(set(), self._found("ipod"))
        self.assertEqual({"p-tripod"}, self._found("tripod"))

    def test_tokenising_does_not_reopen_fragment_matching(self) -> None:
        # Both words are real, but neither may be found inside "Tripods".
        self.assertEqual(set(), self._found("nova ipod"))

    def test_tokens_that_no_single_product_satisfies_return_nothing(self) -> None:
        # Every token must be found on the same product.
        self.assertEqual(set(), self._found("samsung tripod"))

    def test_typos_are_not_corrected_at_this_boundary(self) -> None:
        """Spelling is resolved before the storefront is called, not here.

        Fuzzy matching in the database would resurrect fragment matching, so a
        misspelling honestly returns nothing and the caller is expected to have
        resolved the word against the published catalog first.
        """
        self.assertEqual(set(), self._found("samsang"))

    def test_operator_words_are_not_stripped_for_the_caller(self) -> None:
        """A query full of operators returns nothing, and should.

        "top 3 phone from" was a real generated query. Silently discarding
        "top", "3" and "from" here would have hidden that defect instead of
        showing it, so the storefront reports the honest empty result.
        """
        self.assertEqual(set(), self._found("top 3 phone from"))

    def test_a_query_with_no_searchable_characters_matches_nothing(self) -> None:
        self.assertEqual(set(), self._found("!!! ???"))


class SearchTermMatchingTests(unittest.TestCase):
    """Pattern construction, which needs no database."""

    def setUp(self) -> None:
        self.repository = ProductRepository.__new__(ProductRepository)

    def test_like_wildcards_in_the_term_are_neutralised(self) -> None:
        # Without escaping, a term of "_" would match every single character.
        self.assertEqual("\\_", self.repository._escape_like("_"))
        self.assertEqual("\\%", self.repository._escape_like("%"))
        self.assertEqual("\\\\", self.repository._escape_like("\\"))

    def test_separator_prefixes_are_not_treated_as_wildcards(self) -> None:
        """The underscore separator must be escaped in the pattern itself.

        `_` is a single-character wildcard in SQL LIKE, so an unescaped `%_ipod%`
        means "any character then ipod" - which matched "tripod" all over again.
        """
        patterns = self.repository._word_start_patterns("ipod")
        self.assertIn("%\\_ipod%", patterns)
        self.assertNotIn("%_ipod%", patterns)

    def test_a_term_is_anchored_to_the_start_of_a_word(self) -> None:
        patterns = self.repository._word_start_patterns("ipod")
        # Starts-with, and after each word separator - never bare "%ipod%".
        self.assertIn("ipod%", patterns)
        self.assertIn("% ipod%", patterns)
        self.assertIn("%-ipod%", patterns)
        self.assertNotIn("%ipod%", patterns)

    def test_a_multi_word_search_becomes_separate_tokens(self) -> None:
        # Replaces the old rule that kept the phrase intact, which is exactly
        # what stopped a brand and a family from being found together.
        self.assertEqual(["galaxy", "s26"], self.repository._search_tokens("Galaxy S26"))

    def test_repeated_words_are_asked_for_once(self) -> None:
        self.assertEqual(["phone", "case"], self.repository._search_tokens("phone case phone"))

    def test_short_words_keep_their_final_s(self) -> None:
        """Trimming "lens" to "len" would match "Lenovo" - the fragment rule again."""
        self.assertIsNone(self.repository._singular("lens"))
        self.assertIsNone(self.repository._singular("glass"))
        self.assertEqual("phone", self.repository._singular("phones"))
        self.assertEqual("watch", self.repository._singular("watches"))
        self.assertEqual("battery", self.repository._singular("batteries"))


if __name__ == "__main__":
    unittest.main()
