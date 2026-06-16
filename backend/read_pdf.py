import sys, fitz
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"c:\Users\hp\OneDrive\سطح المكتب\pdpl-chatbot\backend\uploads\اللائحة+التنفيذية+لنظام+حماية+البيانات+الشخصية+AR.pdf"
doc = fitz.open(PDF)
print(f"Total pages: {len(doc)}")
for i in range(len(doc)):
    text = doc[i].get_text().strip()
    print(f"\n=== PAGE {i+1} ===")
    print(text[:600])
