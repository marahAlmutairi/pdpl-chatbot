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
    """Return the page number where the article appears in the cleaned file."""
    escaped = re.escape(article_name)
    m = re.search(rf'^المادة\s+{escaped}', content, re.MULTILINE)
    if not m:
        return None
    page_sep_re = re.compile(r'={10,}\nالصفحة\s+(\d+)\n={10,}')
    last_page = None
    for pm in page_sep_re.finditer(content[:m.start()]):
        last_page = int(pm.group(1))
    return last_page


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
