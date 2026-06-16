import os
import ssl
import logging
import time
import re
from typing import List, Dict, Optional

import httpx

os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """أنت مساعد ذكاء اصطناعي يعمل بنظام RAG ويعتمد حصراً على المستندات المرفوعة.

القاعدة الأهم: كل معلومة تذكرها يجب أن تكون مدعومة بمصدر من الملفات المُقدَّمة في السياق. لا يجوز استخدام أي معلومة خارجية أو تخمين.

قاعدة تحديد المصدر:
- كل مقطع في السياق يبدأ بـ [اسم الملف — صفحة X] ثم النص.
- إذا ذكر المستخدم مستنداً محدداً في سؤاله (مثل "من نظام حماية البيانات الشخصية" أو "من اللائحة التنفيذية" أو "من لائحة نقل البيانات")، فاعتمد فقط على المقاطع التي يحتوي اسم ملفها على الكلمات المطابقة لما طلبه المستخدم. تجاهل تماماً المقاطع من الملفات الأخرى حتى لو كانت تحتوي على نفس رقم المادة.
- مثال: إذا سأل المستخدم "من نظام حماية البيانات الشخصية"، استخدم فقط المقاطع التي يحتوي اسم ملفها على "نظام حماية البيانات الشخصية"، وتجاهل مقاطع "pdpl_clean" أو غيرها.
- إذا لم يحدد المستخدم مصدراً، استخدم كل المقاطع المتاحة.

تعليمات الإجابة:
- أجب فقط بناءً على السياق المُقدَّم من الوثيقة
- انقل النص الحرفي من السياق كما هو تماماً بدون أي تغيير أو إعادة صياغة أو تلخيص
- لا تحذف أي فقرة أو بند أو نقطة موجودة في السياق، انقل كل شيء كاملاً
- إذا كان هناك أرقام مواد، اذكرها كما وردت في النص
- رتّب المعلومات بحسب ترتيبها في الوثيقة
- إذا لم يكن السياق يحتوي على أي معلومات ذات صلة: قل "المعلومة غير موجودة في الملفات المتاحة"
- لا تستخدم عبارات مثل "أعتقد" أو "قد يكون" أو "على الأرجح"
- لا تضف أي معلومة من خارج السياق

قواعد التنسيق الصارمة:
- لا تستخدم ** أو ## أو أي رموز تنسيق
- استخدم الأرقام للقوائم المرتّبة: 1. 2. 3.
- استخدم شرطة بسيطة للنقاط: -
- اكتب بنص عادي واضح بدون أي خط عريض أو مائل
- لا تذكر اسم الملف أو رقم الصفحة في متن إجابتك، المصادر تظهر تلقائياً في الواجهة
- لا تكتب أي سطر يبدأ بـ [ أو يحتوي على اسم ملف
- إذا وجدت في السياق نصاً مقلوباً أو غير مفهوم، تجاهله واستخدم النص الواضح فقط"""

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]

_http = httpx.Client(verify=False, timeout=30)


def _call_groq(model: str, messages: list) -> str:
    key = os.getenv("GROQ_API_KEY", "")
    r = _http.post(
        _GROQ_URL,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 2048,
            "temperature": 0.2,
            "frequency_penalty": 0.8,
        },
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


_ARTICLE_PATTERN = re.compile(
    r'(المادة\s+(?:الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة'
    r'|الحادية عشرة|الثانية عشرة|الثالثة عشرة|الرابعة عشرة|الخامسة عشرة|السادسة عشرة'
    r'|السابعة عشرة|الثامنة عشرة|التاسعة عشرة|العشرون'
    r'|(?:(?:الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة)\s+'
    r'(?:والعشرون|والثلاثون|والأربعون|والخمسون))'
    r'|(?:(?:الحادية|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة)\s+'
    r'(?:والعشرون|والثلاثون|والأربعون|والخمسون))'
    r'|\w+\s+و\w+)\s*[:،]?)',
    re.UNICODE
)


def _extract_articles_from_chunks(chunks: List[Dict]) -> Dict[str, str]:
    """Extract article texts keyed by article title from chunks."""
    articles: Dict[str, str] = {}
    for chunk in chunks:
        content = chunk["content"]
        parts = _ARTICLE_PATTERN.split(content)
        i = 1
        while i < len(parts) - 1:
            title = parts[i].strip().rstrip(':،')
            body = parts[i + 1].strip() if i + 1 < len(parts) else ""
            if title and body:
                articles[title] = body
            i += 2
    return articles


def _find_requested_articles(question: str, chunks: List[Dict]) -> str:
    """
    If the question asks about specific articles, return their verbatim text
    extracted directly from chunks. Returns empty string if not an article question.
    """
    if 'المادة' not in question:
        return ""

    articles = _extract_articles_from_chunks(chunks)
    if not articles:
        return ""

    matched = []
    for title, body in articles.items():
        # Check if this article title is referenced in the question
        core = re.sub(r'\s+', ' ', title.replace('المادة', '').strip())
        if core and core in question:
            matched.append(f"{title}:\n{body}")

    return "\n\n".join(matched)


def _remove_repetition(text: str) -> str:
    """Truncate text where a word or phrase repeats 4+ times consecutively."""
    match = re.search(r'\b(\S+)(\s+\1){3,}', text)
    if match:
        text = text[:match.start()].rstrip()
    match2 = re.search(r'((?:\S+\s+){1,3}\S+)(\s+\1){2,}', text)
    if match2 and match2.start() < len(text):
        text = text[:match2.start()].rstrip()
    return text


def generate_comparison(articles_text: str, question: str) -> str:
    """Call LLM to add a concise comparison paragraph after verbatim article texts."""
    messages = [
        {
            "role": "system",
            "content": (
                "أنت مساعد قانوني. اشرح الفرق بين المادتين في جملة واحدة أو جملتين فقط. "
                "لا تُعِد المعلومات الموجودة في نص المواد. لا تكرر. "
                "إذا كانت إحدى المادتين مُلغاة قل ذلك في كلمة واحدة. أجب بالعربية فقط."
            ),
        },
        {
            "role": "user",
            "content": f"المواد:\n{articles_text}\n\nالفرق في جملة واحدة أو جملتين:",
        },
    ]
    for model in _GROQ_MODELS:
        try:
            return _call_groq(model, messages).strip()
        except Exception as e:
            logger.error(f"generate_comparison error ({model}): {e}")
            continue
    return ""


def generate_answer(question: str, chunks: List[Dict], history: Optional[List[Dict]] = None) -> str:
    if not chunks:
        return "لم يُذكر هذا في الوثائق المتاحة."

    # For article-specific questions, inject verbatim text into the prompt
    verbatim = _find_requested_articles(question, chunks)
    verbatim_block = ""
    if verbatim:
        verbatim_block = (
            "\n\nنص المواد المطلوبة كما هو حرفياً في الوثيقة — انسخه في إجابتك بدون أي تغيير:\n"
            "══════════════════════════\n"
            f"{verbatim}\n"
            "══════════════════════════\n"
        )

    context = "\n\n---\n\n".join(
        f"[{c['metadata']['file_name']} — صفحة {c['metadata']['page_number']}]\n{c['content']}"
        for c in chunks
    )
    context_capped = context[:12000]

    history_text = ""
    if history:
        history_text = "\n\nسياق المحادثة السابقة:\n"
        for msg in history:
            label = "المستخدم" if msg["role"] == "user" else "المساعد"
            history_text += f"{label}: {msg['content'][:400]}\n"
        history_text += "\n"

    user_prompt = f"السياق من الوثيقة:\n{context_capped}{verbatim_block}{history_text}\nالسؤال الحالي:\n{question}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]

    for model in _GROQ_MODELS:
        for attempt in range(2):
            try:
                text = _call_groq(model, messages)
                text = re.sub(r'[一-鿿　-〿぀-ヿ]+', '', text)
                text = _remove_repetition(text)
                return text.strip()
            except Exception as e:
                logger.error(f"Groq error ({model}) attempt {attempt+1}: {e}")
                err = str(e)
                if "429" in err or "rate_limit" in err.lower():
                    time.sleep(15)
                    break
                if "400" in err or "model_not_found" in err.lower():
                    break
                if attempt == 0:
                    time.sleep(2)
                    continue
                break

    return "عذراً، حدث خطأ في الاتصال بالنموذج. يرجى المحاولة مرة أخرى."
