import re
import unicodedata
from pathlib import Path
from typing import List, Dict

import fitz  # PyMuPDF
from docx import Document as DocxDocument


def _normalize(text: str) -> str:
    return unicodedata.normalize("NFKC", text)


def _is_reversed(line: str) -> bool:
    """Return True if the line has reversed word order (BiDi visual order)."""
    s = line.strip()
    if not s:
        return False
    if s[0] in '،؛.,:؟!':
        return True
    tokens = s.split()
    for t in tokens:
        if not t:
            continue
        if t[0] in 'ةى':
            return True
        if len(t) > 3 and t[-2:] == 'ال':
            return True
    if len(tokens) >= 4:
        bad = sum(1 for t in tokens if t and t[0] in '،؛.:')
        if bad / len(tokens) > 0.25:
            return True
    return False


def _fix_line(line: str) -> str:
    """Fix reversed line by reversing word order; return empty string if unfixable."""
    s = line.strip()
    if not s:
        return ''
    if not _is_reversed(s):
        return s
    # reverse the word order
    fixed = ' '.join(reversed(s.split()))
    # if still looks garbled after fix, discard
    if _is_reversed(fixed):
        return ''
    return fixed


def _clean_pdf_text(text: str) -> str:
    # fix colon split e.g. "الب :يانات" → "البيانات:"
    text = re.sub(r'(\S+)\s+:(\S+)', r'\1\2:', text)
    # fix split word: single Arabic char detached from next word e.g. "ذ لك" → "ذلك"
    text = re.sub(r'(?<!\S)([؀-ۿ])\s+([؀-ۿ]{2,})', r'\1\2', text)
    # fix split word before Arabic suffix e.g. "معالج ة" → "معالجة"
    text = re.sub(r'([؀-ۿ]{2,})\s+([ةهاويىتن]{1,3})([\s,،.]|$)', r'\1\2\3', text)
    # join continuation lines: if a line ends mid-word (no space/punct at end)
    # and next line starts with 1-4 chars that look like a suffix
    text = re.sub(r'([؀-ۿ]{2,})\n([؀-ۿ]{1,4}[\s,،.])', r'\1\2', text)

    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append('')
            continue
        # skip standalone numbers (1-2 digits only)
        if re.fullmatch(r'\d{1,2}', stripped):
            continue
        # skip isolated single Arabic letter
        if re.fullmatch(r'[؀-ۿ]', stripped):
            continue
        # fix reversed lines; discard if unfixable
        fixed = _fix_line(stripped)
        if not fixed:
            continue
        cleaned.append(fixed)

    result = '\n'.join(cleaned)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()


def load_file(file_path: str) -> List[Dict]:
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(file_path)
    elif suffix == ".docx":
        return _load_docx(file_path)
    elif suffix == ".txt":
        return _load_txt(file_path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _extract_rtl_text(page) -> str:
    """Extract Arabic RTL text by sorting spans right-to-left per line."""
    blocks = page.get_text("dict", sort=True).get("blocks", [])
    lines_text = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            # sort spans by x descending = right-to-left reading order
            spans_sorted = sorted(spans, key=lambda s: -s["bbox"][0])
            line_text = " ".join(s["text"].strip() for s in spans_sorted if s["text"].strip())
            if line_text.strip():
                lines_text.append(line_text.strip())
    return "\n".join(lines_text)


def _load_pdf(file_path: str) -> List[Dict]:
    doc = fitz.open(file_path)
    pages = []
    for page_num, page in enumerate(doc, start=1):
        raw = _extract_rtl_text(page)
        text = _clean_pdf_text(_normalize(raw))
        if text:
            pages.append({
                "content": text,
                "metadata": {
                    "file_name": Path(file_path).name,
                    "page_number": page_num,
                },
            })
    doc.close()
    return pages


def _load_docx(file_path: str) -> List[Dict]:
    doc = DocxDocument(file_path)
    result = []
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if text:
            result.append({
                "content": text,
                "metadata": {
                    "file_name": Path(file_path).name,
                    "page_number": i + 1,
                },
            })
    return result


def _load_txt(file_path: str) -> List[Dict]:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    # Handle cleaned TXT files that have page separators (produced by fix_pdf.py)
    stem = Path(file_path).stem
    if stem.endswith("_clean"):
        return _parse_clean_txt(content, stem[:-6])  # strip "_clean" suffix

    return [{
        "content": content,
        "metadata": {
            "file_name": Path(file_path).name,
            "page_number": 1,
        },
    }]


def _parse_clean_txt(content: str, original_stem: str) -> List[Dict]:
    """Parse page-separated TXT produced by fix_pdf.py into per-page docs."""
    file_name = original_stem + ".pdf"
    separator = re.compile(r"={50,}\nالصفحة\s+(\d+)\n={50,}")
    parts = separator.split(content)
    # parts: [text_before_first_sep, page_num, page_text, page_num, page_text, ...]
    result = []
    i = 1  # skip leading empty string before first separator
    while i < len(parts) - 1:
        page_num = int(parts[i])
        page_text = parts[i + 1].strip()
        if page_text:
            result.append({
                "content": page_text,
                "metadata": {
                    "file_name": file_name,
                    "page_number": page_num,
                },
            })
        i += 2
    return result
