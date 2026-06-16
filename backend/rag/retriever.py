"""
BM25-based retrieval — fully local, no API or model download needed.
Documents are indexed in memory when the server starts.
"""
import json
from pathlib import Path
from typing import List, Dict

import unicodedata
from rank_bm25 import BM25Okapi

_indexes: Dict[str, dict] = {}   # key → {"bm25": BM25Okapi, "chunks": [...]}
STORE_PATH = Path(__file__).parent.parent / "bm25_store.json"


import re as _re

_STRIP = _re.compile(r'[؟?!،,\.:\(\)\[\]«»"\'؛;]+')
_CLITIC = _re.compile(r'^(وال|فال|بال|لل|ال|و|ف|ب|ل|ك)')


def _normalize_arabic(text: str) -> str:
    text = _re.sub(r'[أإآ]', 'ا', text)   # hamza variants → alef
    text = text.replace('ى', 'ي')           # alef maqsura → ya
    text = text.replace('ة', 'ه')           # ta marbuta → ha  (جهة=جهه)
    text = _re.sub(r'[ً-ٟ]', '', text)  # strip tashkeel
    return text


def _strip_clitic(token: str) -> str:
    m = _CLITIC.match(token)
    if m and len(token) - len(m.group()) >= 2:
        return token[len(m.group()):]
    return token


def _tokenize(text: str) -> List[str]:
    normalized = unicodedata.normalize("NFKC", text).lower()
    normalized = _normalize_arabic(normalized)
    cleaned = _STRIP.sub(' ', normalized)
    result = []
    seen = set()
    for t in cleaned.split():
        if len(t) < 2:
            continue
        stripped = _strip_clitic(t)
        for variant in (t, stripped):
            if variant not in seen and len(variant) > 1:
                seen.add(variant)
                result.append(variant)
    return result


def index_chunks(chunks: List[Dict], store_key: str):
    tokenized = [_tokenize(c["content"]) for c in chunks]
    _indexes[store_key] = {
        "bm25": BM25Okapi(tokenized),
        "chunks": chunks,
    }
    _persist()


def _persist():
    data = {k: v["chunks"] for k, v in _indexes.items()}
    STORE_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def load_from_disk():
    if not STORE_PATH.exists():
        return
    data = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    for key, chunks in data.items():
        tokenized = [_tokenize(c["content"]) for c in chunks]
        _indexes[key] = {"bm25": BM25Okapi(tokenized), "chunks": chunks}


def is_key_indexed(store_key: str) -> bool:
    return store_key in _indexes


_SYNONYMS: Dict[str, List[str]] = {
    'حذف':       ['محو', 'مسح'],
    'محو':       ['حذف', 'مسح'],
    'تعديل':     ['تصحيح'],
    'تصحيح':     ['تعديل'],
    'سرية':      ['خصوصيه'],
    'خصوصيه':    ['سريه'],
    'نقل':       ['إرسال', 'ارسال'],
    'اختراق':    ['خرق', 'انتهاك', 'تسرب'],
    'تسرب':      ['اختراق', 'خرق', 'انتهاك'],
    'عقوبه':     ['غرامه', 'جزاء', 'عقوبات'],
    'غرامه':     ['عقوبه', 'جزاء'],
    'فرق':       ['تعريف', 'يقصد', 'الفرق'],
    'تعريف':     ['فرق', 'يقصد'],
    'شروط':      ['ضوابط', 'متطلبات'],
    'ضوابط':     ['شروط', 'متطلبات'],
    'موافقه':    ['رضا', 'قبول'],
    'عقوبات':    ['غرامات', 'جزاءات'],
    # جهة التحكم ↔ معالج البيانات
    'معالجه':    ['معالج', 'معالجين', 'يعالج'],
    'معالج':     ['معالجه', 'معالجين'],
    'تحكم':      ['تحكميه', 'متحكم', 'مسيطر'],
    'جهه':       ['صاحب', 'مسؤول'],
    # مدة الاحتفاظ
    'احتفاظ':    ['تخزين', 'حفظ', 'مده', 'مدة'],
    'مده':       ['احتفاظ', 'فتره', 'مدة'],
    'مدة':       ['احتفاظ', 'فتره', 'مده'],
    'تخزين':     ['احتفاظ', 'حفظ'],
    # الإشعار والإخطار
    'اشعار':     ['إخطار', 'ابلاغ', 'تبليغ', 'اعلام'],
    'إخطار':     ['اشعار', 'ابلاغ'],
    'ابلاغ':     ['اشعار', 'إخطار'],
    # الحوكمة
    'حوكمه':     ['اداره', 'تنظيم', 'رقابه'],
    # الأطراف
    'طرف':       ['جهه', 'شركه', 'مؤسسه'],
}


def _expand_query(tokens: List[str]) -> List[str]:
    expanded = list(tokens)
    seen = set(tokens)
    for t in tokens:
        for syn in _SYNONYMS.get(t, []):
            for variant in _tokenize(syn):
                if variant not in seen:
                    seen.add(variant)
                    expanded.append(variant)
    return expanded


# Keywords (normalized) → substring that must appear in file_name (also normalized)
_FILE_HINTS: List[tuple] = [
    (["نظام حمايه البيانات الشخصيه", "نظام حمايه البيانات", "النظام الاساسي"], "نظام حمايه البيانات الشخصيه"),
    (["لائحه نقل البيانات", "نقل البيانات خارج المملكه", "لائحه النقل"], "نقل"),
    (["اللائحه التنفيذيه", "pdpl"], "pdpl"),
]


def _detect_target_file(question: str) -> str:
    """Return a substring that the target file_name must contain, or '' for all files."""
    q = _normalize_arabic(question.lower())
    for keywords, file_hint in _FILE_HINTS:
        if any(kw in q for kw in keywords):
            return file_hint
    return ""


def retrieve(question: str, user_id: int, k: int = 5) -> List[Dict]:
    query_tokens = _expand_query(_tokenize(question))
    target_file = _detect_target_file(question)
    results = []

    for key in ["shared", f"user_{user_id}"]:
        if key not in _indexes:
            continue
        entry = _indexes[key]
        chunks = entry["chunks"]
        scores = entry["bm25"].get_scores(query_tokens)
        top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k * 2]

        seen = set()
        for idx in top_idx:
            if scores[idx] <= 0:
                continue
            for i in [idx, min(idx + 1, len(chunks) - 1)]:
                if i in seen:
                    continue
                seen.add(i)
                chunk = chunks[i].copy()
                base_score = float(scores[i]) if scores[i] > 0 else float(scores[idx]) * 0.9
                if target_file:
                    file_name = _normalize_arabic(chunk.get("metadata", {}).get("file_name", "").lower())
                    if target_file in file_name:
                        base_score *= 3.0
                    else:
                        base_score *= 0.1
                chunk["score"] = base_score
                results.append(chunk)

    results.sort(key=lambda x: x["score"], reverse=True)
    seen_content = set()
    unique = []
    for r in results:
        key = r["content"][:80]
        if key not in seen_content:
            seen_content.add(key)
            unique.append(r)
    return unique[:k]
