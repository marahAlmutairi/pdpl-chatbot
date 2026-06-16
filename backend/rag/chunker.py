from typing import List, Dict

CHUNK_CHARS = 1500   # ~500 tokens for Arabic/mixed text
OVERLAP_CHARS = 300  # ~100 tokens


def chunk_documents(documents: List[Dict]) -> List[Dict]:
    chunks = []
    chunk_id = 0

    for doc in documents:
        text = doc["content"]
        metadata = doc["metadata"]

        start = 0
        while start < len(text):
            end = start + CHUNK_CHARS

            # Try to break at a natural boundary (newline or space)
            if end < len(text):
                break_at = text.rfind("\n", start, end)
                if break_at == -1 or break_at <= start:
                    break_at = text.rfind(" ", start, end)
                if break_at > start:
                    end = break_at

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "content": chunk_text,
                    "metadata": {
                        **metadata,
                        "chunk_id": f"chunk_{chunk_id}",
                    },
                })
                chunk_id += 1

            if end >= len(text):
                break
            start = end - OVERLAP_CHARS

    return chunks
