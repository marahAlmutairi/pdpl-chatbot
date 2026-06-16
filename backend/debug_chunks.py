import json, sys

data = json.loads(open("bm25_store.json", encoding="utf-8").read())
chunks = data.get("shared", [])

out = open("debug_out.txt", "w", encoding="utf-8")
out.write(f"Total chunks: {len(chunks)}\n\n")
for i, c in enumerate(chunks[:10]):
    out.write(f"--- Chunk {i} | Page {c['metadata']['page_number']} ---\n")
    out.write(c["content"][:400] + "\n\n")
out.close()
print("Written to debug_out.txt")
