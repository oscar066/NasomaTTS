"""
Migration 0001 — Move embedded pages into document_pages collection.

Old schema: NasomaDocument.pages = [{page_number, text, paragraphs, width, height}]
New schema: NasomaDocument.page_count = int
            NasomaDocumentPage per page in a dedicated collection

Safe to re-run: insert_many uses ordered=False so duplicate-key errors from
the unique index on (doc_id, page_number) are silently skipped.
"""

from pymongo import ASCENDING

DESCRIPTION = "Move embedded pages from documents into document_pages collection"


async def upgrade(db) -> None:
    docs_col  = db["documents"]
    pages_col = db["document_pages"]

    # Ensure the target index exists before inserting.
    await pages_col.create_index(
        [("doc_id", ASCENDING), ("page_number", ASCENDING)],
        name="doc_page_unique",
        unique=True,
    )

    # Only touch documents that still carry the old embedded pages field
    # and haven't been migrated yet (page_count absent or zero).
    query = {
        "pages":      {"$exists": True, "$ne": None},
        "page_count": {"$in": [None, 0]},
    }

    total    = await docs_col.count_documents(query)
    migrated = 0

    async for doc in docs_col.find(query):
        doc_id    = doc["_id"]
        raw_pages = doc.get("pages") or []

        if not raw_pages:
            await docs_col.update_one(
                {"_id": doc_id},
                {"$unset": {"pages": ""}, "$set": {"page_count": 0}},
            )
            continue

        page_docs = [
            {
                "doc_id":      doc_id,
                "page_number": page.get("page_number", idx + 1),
                "text":        page.get("text", ""),
                "paragraphs":  page.get("paragraphs", []),
                "width":       float(page.get("width", 0)),
                "height":      float(page.get("height", 0)),
            }
            for idx, page in enumerate(raw_pages)
        ]

        try:
            await pages_col.insert_many(page_docs, ordered=False)
        except Exception:
            # BulkWriteError — some pages already exist from a prior partial
            # run.  The unique index prevented duplicates; continue normally.
            pass

        await docs_col.update_one(
            {"_id": doc_id},
            {
                "$set":   {"page_count": len(raw_pages)},
                "$unset": {"pages": ""},
            },
        )

        migrated += 1

    if total:
        print(f"  0001: migrated {migrated}/{total} documents")
