from typing import List, Dict


def rerank(question: str, chunks: List[Dict], top_k: int = 3) -> List[Dict]:
    """Re-rank by embedding similarity score (already computed in retrieval)."""
    sorted_chunks = sorted(chunks, key=lambda x: x.get("score", 0), reverse=True)
    return sorted_chunks[:top_k]
