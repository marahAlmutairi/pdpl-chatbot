import os, ssl, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(__file__))
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from rag.embeddings import embed_query
r = embed_query("اختبار")
print("embeddings OK, dim:", len(r))
