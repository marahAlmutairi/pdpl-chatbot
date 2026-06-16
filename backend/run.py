"""
Startup script that bypasses corporate SSL proxy before loading any libraries.
Run with: python run.py
"""
import os
import ssl

# Disable SSL verification for corporate proxy environments
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["PYTHONHTTPSVERIFY"] = "0"

ssl._create_default_https_context = ssl._create_unverified_context

# Patch httpx (used by huggingface_hub)
import httpx
_orig_client = httpx.Client.__init__
def _client_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _orig_client(self, *args, **kwargs)
httpx.Client.__init__ = _client_init

_orig_async = httpx.AsyncClient.__init__
def _async_init(self, *args, **kwargs):
    kwargs.setdefault("verify", False)
    _orig_async(self, *args, **kwargs)
httpx.AsyncClient.__init__ = _async_init

# Suppress SSL warnings
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

import uvicorn
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
