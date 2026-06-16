import json, unicodedata
from rank_bm25 import BM25Okapi

data = json.loads(open('bm25_store.json', encoding='utf-8').read())
chunks = data.get('shared', [])

def tok(t):
    return unicodedata.normalize('NFKC', t).lower().split()

tokenized = [tok(c['content']) for c in chunks]
bm25 = BM25Okapi(tokenized)

q = 'ضوابط معالجة البيانات الائتمانية'
scores = bm25.get_scores(tok(q))
top = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:5]

with open('credit_debug.txt', 'w', encoding='utf-8') as out:
    out.write(f'Query: {q}\n\n')
    for idx in top:
        page = chunks[idx]['metadata']['page_number']
        out.write(f'=== Chunk {idx} | Page {page} | Score={scores[idx]:.2f} ===\n')
        out.write(chunks[idx]['content'][:400] + '\n\n')
