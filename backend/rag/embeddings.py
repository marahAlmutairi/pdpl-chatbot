import os
import ssl
from typing import List

# Bypass SSL before importing google.genai (corporate proxy fix)
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

import httpx
_orig = httpx.Client.__init__
def _no_ssl(self, *a, **k): k.setdefault("verify", False); _orig(self, *a, **k)
httpx.Client.__init__ = _no_ssl

_orig_async = httpx.AsyncClient.__init__
def _no_ssl_async(self, *a, **k): k.setdefault("verify", False); _orig_async(self, *a, **k)
httpx.AsyncClient.__init__ = _no_ssl_async

from google import genai  # noqa: E402

MODEL = "text-embedding-004"
_client: genai.Client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client


def embed_texts(texts: List[str]) -> List[List[float]]:
    result = _get_client().models.embed_content(model=MODEL, contents=texts)
    return [e.values for e in result.embeddings]


def embed_query(query: str) -> List[float]:
    return embed_texts([query])[0]
