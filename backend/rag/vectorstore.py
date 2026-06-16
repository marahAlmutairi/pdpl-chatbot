"""Thin wrapper — delegates to BM25 retriever for indexing."""
from typing import List, Dict
from .retriever import index_chunks, is_key_indexed


def upsert_chunks(chunks: List[Dict], user_id: int = None, shared: bool = False):
    key = "shared" if shared else f"user_{user_id}"
    index_chunks(chunks, key)


def is_shared_loaded() -> bool:
    return is_key_indexed("shared")
