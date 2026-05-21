"""
ChromaDB-backed vector store for semantic memory.
Uses sentence-transformers for local embeddings.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from functools import lru_cache
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Lazy imports to avoid slow startup when deps are optional
_chromadb = None
_SentenceTransformer = None
_chroma_client = None
_embedding_fn = None


def _init_chroma(persist_dir: str, embedding_model: str) -> tuple:
    """Initialize ChromaDB client and embedding function (once)."""
    global _chromadb, _SentenceTransformer, _chroma_client, _embedding_fn

    if _chroma_client is not None:
        return _chroma_client, _embedding_fn

    try:
        import chromadb
        from chromadb.utils import embedding_functions

        _chromadb = chromadb

        # Use sentence-transformers embedding function bundled with ChromaDB
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embedding_model
        )

        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        logger.info("ChromaDB initialized at %s", persist_dir)
    except Exception as exc:
        logger.warning("ChromaDB init failed (%s). Falling back to in-memory.", exc)
        try:
            import chromadb

            _chromadb = chromadb
            _chroma_client = chromadb.Client()  # ephemeral
            _embedding_fn = None
        except Exception as exc2:
            logger.error("ChromaDB completely unavailable: %s", exc2)
            _chroma_client = None
            _embedding_fn = None

    return _chroma_client, _embedding_fn


class VectorStore:
    """
    Async wrapper around a ChromaDB persistent client.
    Each logical collection is a separate ChromaDB collection.
    """

    def __init__(self, persist_dir: str = "/data/chroma", embedding_model: str = "all-MiniLM-L6-v2"):
        self.persist_dir = persist_dir
        self.embedding_model = embedding_model
        self._client = None
        self._embedding_fn = None
        self._collections: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    def _ensure_init(self) -> bool:
        if self._client is None:
            self._client, self._embedding_fn = _init_chroma(
                self.persist_dir, self.embedding_model
            )
        return self._client is not None

    def _get_collection(self, name: str):
        if not self._ensure_init():
            raise RuntimeError("ChromaDB client not available")
        if name not in self._collections:
            kwargs: dict[str, Any] = {"name": name, "get_or_create": True}
            if self._embedding_fn is not None:
                kwargs["embedding_function"] = self._embedding_fn
            self._collections[name] = self._client.get_or_create_collection(
                name=name,
                **({"embedding_function": self._embedding_fn} if self._embedding_fn else {}),
            )
        return self._collections[name]

    async def add_memory(
        self,
        content: str,
        metadata: Optional[dict] = None,
        collection: str = "default",
        memory_id: Optional[str] = None,
    ) -> str:
        """Add a document to the vector store. Returns the assigned ID."""
        async with self._lock:
            mem_id = memory_id or str(uuid.uuid4())
            meta = metadata or {}
            # ChromaDB metadata values must be str/int/float/bool
            safe_meta = {k: str(v) if not isinstance(v, (str, int, float, bool)) else v
                         for k, v in meta.items()}
            try:
                col = self._get_collection(collection)
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: col.add(
                        documents=[content],
                        metadatas=[safe_meta],
                        ids=[mem_id],
                    ),
                )
                return mem_id
            except Exception as exc:
                logger.error("add_memory failed: %s", exc)
                raise

    async def search_memory(
        self,
        query: str,
        n_results: int = 5,
        collection: str = "default",
    ) -> list[dict]:
        """Semantic search. Returns list of {id, content, metadata, distance}."""
        try:
            col = self._get_collection(collection)
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: col.query(
                    query_texts=[query],
                    n_results=min(n_results, max(col.count(), 1)),
                ),
            )
            output = []
            ids = results.get("ids", [[]])[0]
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
            for mem_id, doc, meta, dist in zip(ids, docs, metas, distances):
                output.append(
                    {
                        "id": mem_id,
                        "content": doc,
                        "metadata": meta or {},
                        "distance": dist,
                    }
                )
            return output
        except Exception as exc:
            logger.error("search_memory failed: %s", exc)
            return []

    async def get_all_memories(self, collection: str = "default") -> list[dict]:
        """Return all documents in a collection."""
        try:
            col = self._get_collection(collection)
            count = await asyncio.get_event_loop().run_in_executor(
                None, col.count
            )
            if count == 0:
                return []
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: col.get(include=["documents", "metadatas"]),
            )
            output = []
            for mem_id, doc, meta in zip(
                results.get("ids", []),
                results.get("documents", []),
                results.get("metadatas", []),
            ):
                output.append({"id": mem_id, "content": doc, "metadata": meta or {}})
            return output
        except Exception as exc:
            logger.error("get_all_memories failed: %s", exc)
            return []

    async def delete_memory(self, memory_id: str, collection: str = "default") -> bool:
        """Delete a memory by ID."""
        try:
            col = self._get_collection(collection)
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: col.delete(ids=[memory_id])
            )
            return True
        except Exception as exc:
            logger.error("delete_memory failed: %s", exc)
            return False

    async def collection_count(self, collection: str = "default") -> int:
        """Return number of documents in a collection."""
        try:
            col = self._get_collection(collection)
            return await asyncio.get_event_loop().run_in_executor(None, col.count)
        except Exception:
            return 0


# Global singleton – initialized lazily on first use
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        from app.config import settings

        _vector_store = VectorStore(
            persist_dir=settings.memory.vector_db_path,
            embedding_model=settings.memory.embedding_model,
        )
    return _vector_store
