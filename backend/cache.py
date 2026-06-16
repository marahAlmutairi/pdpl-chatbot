import hashlib
from datetime import datetime, timedelta
from typing import Optional


class QueryCache:
    def __init__(self, ttl_minutes: int = 60):
        self._store: dict = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def _key(self, user_id: int, question: str) -> str:
        normalized = question.strip().lower()
        return f"{user_id}:{hashlib.md5(normalized.encode()).hexdigest()}"

    def get(self, user_id: int, question: str) -> Optional[dict]:
        key = self._key(user_id, question)
        entry = self._store.get(key)
        if entry is None:
            return None
        if datetime.utcnow() > entry["expires_at"]:
            del self._store[key]
            return None
        return entry["data"]

    def set(self, user_id: int, question: str, data: dict):
        key = self._key(user_id, question)
        self._store[key] = {
            "data": data,
            "expires_at": datetime.utcnow() + self._ttl,
        }


query_cache = QueryCache()
