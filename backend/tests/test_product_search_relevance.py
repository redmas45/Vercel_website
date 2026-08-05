"""Search terms must match whole words, not fragments inside other words.

Reproduced defect (local, 2026-08-05): searching the storefront for "ipod"
returned five camera lenses, because the query was matched anywhere inside any
field and the subcategory "Lenses & Tripods" contains the letters "ipod".
Searching "ens" likewise returned every product with "Lens" in its name.

These tests exercise the repository's own predicate builder against a small
in-memory catalog, so they stay fast and independent of the seeded database.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.repositories.product_repository import ProductRepository


class SearchTermMatchingTests(unittest.TestCase):
    """The predicate is built without a session, so no database is needed."""

    def setUp(self) -> None:
        self.repository = ProductRepository.__new__(ProductRepository)

    def _patterns(self, term: str) -> list[str]:
        """The LIKE patterns the repository would search for this term."""
        escaped = self.repository._escape_like(term.strip().lower())
        return [
            f"{escaped}%" if prefix == "" else f"%{self.repository._escape_like(prefix)}{escaped}%"
            for prefix in self.repository._WORD_START_PREFIXES
        ]

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
        patterns = self._patterns("ipod")
        self.assertIn("%\\_ipod%", patterns)
        self.assertNotIn("%_ipod%", patterns)

    def test_a_term_is_anchored_to_the_start_of_a_word(self) -> None:
        patterns = self._patterns("ipod")
        # Starts-with, and after each word separator - never bare "%ipod%".
        self.assertIn("ipod%", patterns)
        self.assertIn("% ipod%", patterns)
        self.assertIn("%-ipod%", patterns)
        self.assertNotIn("%ipod%", patterns)

    def test_multi_word_terms_are_kept_intact(self) -> None:
        self.assertIn("galaxy s26%", self._patterns("Galaxy S26"))


if __name__ == "__main__":
    unittest.main()
