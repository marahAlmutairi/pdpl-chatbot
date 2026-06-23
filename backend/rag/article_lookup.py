"""
Direct article text lookup from cleaned .txt files — bypasses BM25 and LLM.
Used when the user asks for specific articles verbatim.
""" # v3
import re
from pathlib import Path
from typing import List, Optional

_CLEANED_DIR = Path(__file__).parent.parent.parent / "data" / "cleaned"

# Normalized Arabic article number words → file substring hint
_FILE_HINTS = [
    (["اللائحة التنفيذية", "اللائحه التنفيذيه", "الائحة التنفيذية", "الائحه التنفيذيه", "pdpl"], "pdpl_clean"),
    (["لائحة نقل البيانات", "نقل البيانات خارج المملكة", "لائحه نقل"], "نقل"),
    (["نظام حماية البيانات الشخصية", "نظام حمايه البيانات"], "نظام حماية البيانات الشخصية"),
]

_ARTICLE_NUMBER_WORDS = [
    "الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة",
    "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة",
    "الحادية عشرة", "الثانية عشرة", "الثالثة عشرة", "الرابعة عشرة",
    "الخامسة عشرة", "السادسة عشرة", "السابعة عشرة", "الثامنة عشرة",
    "التاسعة عشرة", "العشرون",
    "الحادية والعشرون", "الثانية والعشرون", "الثالثة والعشرون",
    "الرابعة والعشرون", "الخامسة والعشرون", "السادسة والعشرون",
    "السابعة والعشرون", "الثامنة والعشرون", "التاسعة والعشرون",
    "الثلاثون",
    "الحادية والثلاثون", "الثانية والثلاثون", "الثالثة والثلاثون",
    "الرابعة والثلاثون", "الخامسة والثلاثون", "السادسة والثلاثون",
    "السابعة والثلاثون", "الثامنة والثلاثون", "التاسعة والثلاثون",
    "الأربعون",
    "الحادية والأربعون", "الثانية والأربعون", "الثالثة والأربعون",
    "الرابعة والأربعون", "الخامسة والأربعون", "السادسة والأربعون",
    "السابعة والأربعون", "الثامنة والأربعون", "التاسعة والأربعون",
    "الخمسون",
]


def _detect_file(question: str) -> Optional[Path]:
    """Return the cleaned .txt file that best matches the question's source hint."""
    q = question
    for keywords, hint in _FILE_HINTS:
        if any(kw in q for kw in keywords):
            for f in _CLEANED_DIR.glob("*.txt"):
                if hint.lower() in f.name.lower():
                    return f
    return None


def _extract_article(content: str, article_name: str) -> str:
    """
    Extract the full text of one article from cleaned file content.
    Returns the article title + all its lines, stopping at the next article or page separator.
    """
    # Match the title line — allows optional subtitle after colon (e.g. "المادة الرابعة: الحق في العلم")
    escaped = re.escape(article_name)
    start_re = re.compile(rf'^(المادة\s+{escaped}[^\n]*)', re.MULTILINE)
    # Only match proper article titles (المادة ال...) — not inline references like المادة )الرابعة(
    next_article_re = re.compile(r'^المادة\s+ال', re.MULTILINE)
    page_sep_re = re.compile(r'^={10,}', re.MULTILINE)

    m = start_re.search(content)
    if not m:
        return ""

    title_line = m.group(1).strip()
    rest = content[m.end():]

    # Stop only at the next article title — page separators are kept so long articles span pages correctly
    end = len(rest)
    stopper = next_article_re.search(rest)
    if stopper:
        end = stopper.start()

    # Strip page separator lines from the body but keep the content between them
    body_raw = rest[:end]
    body = re.sub(r'={10,}\nالصفحة\s+\d+\n={10,}', '', body_raw).strip()
    if not body:
        return ""
    return f"{title_line}\n{body}"


def _normalize(text: str) -> str:
    """Normalize hamza variants so الأولى == الاولى, and ta-marbuta == ha."""
    text = re.sub(r'[أإآ]', 'ا', text)
    text = text.replace('ة', 'ه')
    text = text.replace('ى', 'ي')
    return text


def _flexible_pattern(name_norm: str) -> str:
    """Allow optional whitespace before final ه in each word (handles 'عشر ه' → 'عشره')."""
    parts = name_norm.split()
    patterns = []
    for part in parts:
        if part.endswith('ه') and len(part) > 1:
            patterns.append(re.escape(part[:-1]) + r'\s*ه')
        else:
            patterns.append(re.escape(part))
    return r'\s*'.join(patterns)


def _find_article_names_in_question(question: str) -> List[str]:
    """
    Extract article number phrases using longest-match-first with position tracking.
    Handles patterns like "المادة X والمادة Y" and "المادة X وY" (Arabic 'and' shorthand).
    Normalizes hamza variants so الأولى matches الاولى.
    """
    q_norm = _normalize(question)
    candidates = sorted(_ARTICLE_NUMBER_WORDS, key=len, reverse=True)
    found = []
    consumed: set = set()

    for name in candidates:
        name_norm = _normalize(name)
        for m in re.finditer(_flexible_pattern(name_norm), q_norm):
            start, end = m.start(), m.end()
            if any(p in consumed for p in range(start, end)):
                continue
            found.append(name)   # return original (non-normalized) name for file lookup
            consumed.update(range(start, end))
            break

    return found


def _find_article_page(content: str, article_name: str) -> Optional[int]:
    """
    Return the estimated page number where the article appears.
    When multiple articles share one page block (missing separator),
    we estimate position proportionally between the surrounding page markers.
    """
    escaped = re.escape(article_name)
    m = re.search(rf'^المادة\s+{escaped}', content, re.MULTILINE)
    if not m:
        return None

    article_pos = m.start()
    page_sep_re = re.compile(r'={10,}\nالصفحة\s+(\d+)\n={10,}')

    prev_page, prev_pos = None, 0
    next_page, next_pos = None, len(content)

    for pm in page_sep_re.finditer(content):
        if pm.start() < article_pos:
            prev_page = int(pm.group(1))
            prev_pos = pm.start()
        elif pm.start() > article_pos and next_page is None:
            next_page = int(pm.group(1))
            next_pos = pm.start()

    if prev_page is None:
        return None

    # If only one page missing between markers, estimate by position ratio
    if next_page is not None and next_page > prev_page + 1:
        page_gap = next_page - prev_page
        ratio = (article_pos - prev_pos) / max(next_pos - prev_pos, 1)
        estimated = prev_page + round(ratio * page_gap)
        return max(prev_page, min(next_page - 1, estimated))

    return prev_page


def lookup_by_title_keywords(keywords: list) -> tuple:
    """
    ابحث عن المواد التي يحتوي عنوانها على إحدى الكلمات المفتاحية.
    يُستخدم لأسئلة المقارنة التي لا تذكر رقم المادة.
    مثال: ["الصحيه", "الائتمانيه"] → يجد المادة 26 والمادة 27
    """
    # البحث على النص الأصلي لتجنب اختلاف مواضع النص المُعدَّل
    _title_re = re.compile(r'^(المادة\s+\S+(?:\s+\S+){0,4}:[^\n]*)', re.MULTILINE)
    _art_name_re = re.compile(r'^المادة\s+(\S+(?:\s+\S+){0,4}):', re.MULTILINE)

    results = []
    sources = []
    seen_pages: set = set()
    seen_texts: set = set()

    for txt_file in sorted(_CLEANED_DIR.glob("*.txt")):
        content = txt_file.read_text(encoding="utf-8")

        for kw in keywords:
            kw_norm = _normalize(kw.strip())
            if not kw_norm:
                continue
            # ابحث في النص الأصلي، وعدِّل العنوان فقط عند المقارنة
            for m in _title_re.finditer(content):
                title_norm = _normalize(m.group(1))
                if kw_norm not in title_norm:
                    continue
                # استخرج اسم المادة من نفس الموضع في النص الأصلي
                art_m = _art_name_re.match(content, m.start())
                if not art_m:
                    continue
                art_name = art_m.group(1).rstrip(':،').strip()
                text = _extract_article(content, art_name)
                if not text or text in seen_texts:
                    continue
                seen_texts.add(text)
                results.append(text)
                stem = txt_file.stem
                if stem.endswith("_clean"):
                    stem = stem[:-6]
                doc_name = stem + ".pdf"
                page = _find_article_page(content, art_name)
                key = (doc_name, page)
                if key not in seen_pages:
                    seen_pages.add(key)
                    sources.append({"file": doc_name, "page": page or 1})
                break  # كلمة مفتاحية واحدة → مادة واحدة من هذا الملف

    return "\n\n".join(results), sources


def _extract_comparison_keywords(question: str) -> list:
    """
    استخرج الكلمات الموضوعية من سؤال المقارنة.
    مثال: "ما الفرق بين البيانات الصحية والائتمانية" → ["الصحية", "الائتمانية"]
    """
    stop = {'ما', 'ماذا', 'الفرق', 'فرق', 'بين', 'مقارنة', 'قارن',
            'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هل', 'كيف', 'لماذا',
            'معالجة', 'معالجه', 'البيانات', 'بيانات', 'نظام', 'اللائحة', 'و', 'أو'}
    stop_norm = {_normalize(s) for s in stop}

    # أزل "و" العاطفة الملتصقة بأول الكلمة قبل التصفية
    raw_words = re.findall(r'\b\w{3,}\b', question)
    words = []
    for w in raw_words:
        clean = re.sub(r'^و', '', w) if w.startswith('و') and len(w) > 3 else w
        if _normalize(clean) not in stop_norm and len(clean) >= 4:
            words.append(clean)
    return words


def lookup_articles(question: str):
    """
    If the question asks for specific articles from a named document,
    return (text, sources) where sources is a list of {file, page} dicts.
    Returns ("", []) when no article names are detected.
    """
    # Flexible check: handles typos like "الماادة" (double alef) or "الماده"
    if not re.search(r'الم[اأإآ]+د', question):
        return "", []

    article_names = _find_article_names_in_question(question)
    if not article_names:
        return "", []

    target_file = _detect_file(question)
    if not target_file:
        candidates = list(_CLEANED_DIR.glob("*.txt"))
    else:
        candidates = [target_file]

    results = []
    seen_pages = set()
    sources = []
    for art_name in article_names:
        for f in candidates:
            content = f.read_text(encoding="utf-8")
            text = _extract_article(content, art_name)
            if text:
                results.append(text)
                # Build source entry
                stem = f.stem
                if stem.endswith("_clean"):
                    stem = stem[:-6]
                doc_name = stem + ".pdf"
                page = _find_article_page(content, art_name)
                key = (doc_name, page)
                if key not in seen_pages:
                    seen_pages.add(key)
                    sources.append({"file": doc_name, "page": page or 1})
                break

    return "\n\n".join(results), sources
