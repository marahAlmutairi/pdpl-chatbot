import requests, os, ssl
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
requests.packages.urllib3.disable_warnings()

key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
r = requests.get(url, verify=False)
print("Status:", r.status_code)
print("Response:", r.text[:300])
