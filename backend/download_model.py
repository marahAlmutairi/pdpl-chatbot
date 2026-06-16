"""Run once to pre-download the embedding model."""
import os, ssl, sys
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

import httpx
_orig = httpx.Client.__init__
def _p(self, *a, **k): k.setdefault("verify", False); _orig(self, *a, **k)
httpx.Client.__init__ = _p

import urllib3; urllib3.disable_warnings()

print("Downloading paraphrase-multilingual-MiniLM-L12-v2 (~450MB)...")
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
test = model.encode(["test"], normalize_embeddings=True)
print(f"Done! Embedding dim: {len(test[0])}")
