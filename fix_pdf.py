"""
Fix BiDi-encoded Arabic PDFs.
Run from project root: python fix_pdf.py
"""
import re, sys, unicodedata
from pathlib import Path
import fitz

DATA_DIR   = Path("data")
OUTPUT_DIR = Path("data/cleaned")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize(text):
    return unicodedata.normalize("NFKC", text)


def is_reversed(line):
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


def fix_line(line):
    s = line.strip()
    if not s:
        return ''
    if not is_reversed(s):
        return s
    fixed = ' '.join(reversed(s.split()))
    return fixed if not is_reversed(fixed) else ''


def clean_text(text):
    text = re.sub(r'(\S+)\s+:(\S+)', r'\1\2:', text)
    text = re.sub(r'(?<!\S)([؀-ۿ])\s+([؀-ۿ]{2,})', r'\1\2', text)
    text = re.sub(r'([؀-ۿ]{2,})\s+([ةهاويىتن]{1,3})([\s,،.]|$)', r'\1\2\3', text)
    text = re.sub(r'([؀-ۿ]{2,})\n([؀-ۿ]{1,4}[\s,،.])', r'\1\2', text)

    lines_out = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped:
            lines_out.append('')
            continue
        if re.fullmatch(r'\d{1,2}', stripped):
            continue
        if re.fullmatch(r'[؀-ۿ]', stripped):
            continue
        fixed = fix_line(stripped)
        if fixed:
            lines_out.append(fixed)

    result = '\n'.join(lines_out)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()


def extract_rtl(page):
    blocks = page.get_text("dict", sort=True).get("blocks", [])
    lines_text = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = sorted(line.get("spans", []), key=lambda s: -s["bbox"][0])
            line_text = " ".join(s["text"].strip() for s in spans if s["text"].strip())
            if line_text.strip():
                lines_text.append(line_text.strip())
    return "\n".join(lines_text)


def fix_pdf(pdf_path):
    name = pdf_path.name.encode('ascii', 'replace').decode()
    print(f"Processing: {name}")
    doc = fitz.open(str(pdf_path))
    pages_text = []

    for page_num, page in enumerate(doc, start=1):
        raw = extract_rtl(page)
        cleaned = clean_text(normalize(raw))
        if cleaned:
            pages_text.append(f"\n{'='*60}\nالصفحة {page_num}\n{'='*60}\n{cleaned}")

    doc.close()
    full_text = "\n".join(pages_text)

    # save with original stem for easy matching
    out_path = OUTPUT_DIR / (pdf_path.stem + "_clean.txt")
    out_path.write_text(full_text, encoding="utf-8")
    safe_out = out_path.name.encode('ascii', 'replace').decode()
    print(f"  -> Saved: {safe_out}  ({len(full_text):,} chars, {len(pages_text)} pages)")
    return out_path


if __name__ == "__main__":
    pdfs = list(DATA_DIR.glob("*.pdf"))
    if not pdfs:
        print("No PDFs found in data/")
        sys.exit(1)
    for pdf in pdfs:
        fix_pdf(pdf)
    print("\nDone. All clean files saved in data/cleaned/")
