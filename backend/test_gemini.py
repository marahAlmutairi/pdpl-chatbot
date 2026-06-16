import os, ssl, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

import httpx
_orig = httpx.Client.__init__
def _p(self, *a, **k): k.setdefault("verify", False); _orig(self, *a, **k)
httpx.Client.__init__ = _p

_orig_async = httpx.AsyncClient.__init__
def _pa(self, *a, **k): k.setdefault("verify", False); _orig_async(self, *a, **k)
httpx.AsyncClient.__init__ = _pa

from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Testing embeddings...")
result = client.models.embed_content(model="text-embedding-004", contents=["اختبار"])
print(f"Embedding OK — dim: {len(result.embeddings[0].values)}")

print("Testing generation...")
response = client.models.generate_content(model="gemini-2.0-flash", contents="قل مرحبا فقط")
print(f"Generation OK — response: {response.text.strip()}")
