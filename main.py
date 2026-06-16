import streamlit as st
import fitz  # PyMuPDF
import re

st.set_page_config(page_title="PDPL Assistant", page_icon="📄")

st.title("📘 المساعد القانوني لنظام حماية البيانات الشخصية")


# =========================
# 📄 تحميل PDF مع الصفحات
# =========================
def load_pdf():
    pdf = fitz.open("data/pdpl.pdf")

    pages_data = []

    for page_num, page in enumerate(pdf, start=1):
        text = page.get_text()

        pages_data.append({
            "page": page_num,
            "text": text
        })

    return pages_data


# =========================
# 🔍 استخراج أفضل فقرة
# =========================
def search_best_answer(question, pages_data):

    question_words = question.split()

    best_text = ""
    best_page = None
    best_score = 0

    for page in pages_data:

        lines = page["text"].split("\n")

        for line in lines:

            if len(line.strip()) < 10:
                continue

            score = sum(1 for w in question_words if w in line)

            if score > best_score:
                best_score = score
                best_text = line
                best_page = page["page"]

    if best_score == 0:
        return None

    return best_text, best_page


# =========================
# 📌 استخراج رقم المادة (إذا موجود)
# =========================
def extract_article(text):

    match = re.search(r"المادة\s*\(?\d+\)?|\d+\s*-", text)

    if match:
        return match.group()

    return "غير محددة"


# =========================
# 📥 تحميل البيانات مرة واحدة
# =========================
if "pdf_data" not in st.session_state:
    st.session_state.pdf_data = load_pdf()


# =========================
# 💬 واجهة الشات
# =========================
question = st.chat_input("اكتب سؤالك عن نظام حماية البيانات الشخصية...")

if question:

    st.chat_message("user").write(question)

    result = search_best_answer(question, st.session_state.pdf_data)

    if result is None:
        answer = "❌ غير موجود في نظام حماية البيانات الشخصية."
        st.chat_message("assistant").write(answer)

    else:
        text, page = result
        article = extract_article(text)

        answer = f"""
📌 **الإجابة من النظام:**

{text}

---

📄 الصفحة: {page}  
📑 المادة: {article}
"""

        st.chat_message("assistant").write(answer)