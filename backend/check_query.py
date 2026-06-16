import json, unicodedata
from rank_bm25 import BM25Okapi

data = json.loads(open('bm25_store.json', encoding='utf-8').read())
chunks = data.get('shared', [])

def tok(t):
    return unicodedata.normalize('NFKC', t).lower().split()

tokenized = [tok(c['content']) for c in chunks]
bm25 = BM25Okapi(tokenized)

query = 'شروط معالجة البيانات الحساسة'
scores = bm25.get_scores(tok(query))
top5 = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:5]

with open('top5_sensitive.txt', 'w', encoding='utf-8') as out:
    out.write(f'Query: {query}\n\n')
    for idx in top5:
        page = chunks[idx]['metadata']['page_number']
        score = scores[idx]
        content = chunks[idx]['content'][:500]
        out.write(f'=== Chunk {idx} | Page {page} | Score={score:.3f} ===\n')
        out.write(content + '\n\n')

# Also check all chunks for word 'حساسة'
with open('top5_sensitive.txt', 'a', encoding='utf-8') as out:
    out.write('\n\n=== Chunks containing حساسة ===\n')
    for i, c in enumerate(chunks):
        if 'حساسة' in c['content'] or 'الحساسة' in c['content']:
            out.write(f'Chunk {i} | Page {c["metadata"]["page_number"]}: {c["content"][:200]}\n\n')

print('done')
