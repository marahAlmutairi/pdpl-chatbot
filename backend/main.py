# ═══════════════════════════════════════════════════════════════
#  main.py — السيرفر الرئيسي للمشروع
#  هذا الملف هو قلب الـ Backend، يحتوي على:
#  - نقاط الـ API (endpoints) كلها
#  - منطق الـ RAG (استرجاع المعلومات من PDF)
#  - إدارة المحادثات والرسائل في قاعدة البيانات
#  - التحليلات والإحصائيات
# ═══════════════════════════════════════════════════════════════

import json
import logging
import os
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# تحميل المتغيرات من ملف .env (مثل GROQ_API_KEY)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

# FastAPI: إطار عمل الـ API
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
# CORSMiddleware: يسمح للـ Frontend (localhost:5173) بالتواصل مع الـ Backend
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
# BaseModel: يحدد شكل البيانات القادمة من الـ Frontend
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

# ملفات المشروع الداخلية
from cache import query_cache           # كاش الأسئلة المتكررة
from database import Base, engine, get_db  # قاعدة البيانات SQLite
from models import ChatSession, Message    # جداول DB: المحادثات والرسائل
from rag.chunker import chunk_documents    # تقطيع الـ PDF لأجزاء صغيرة
from rag.generator import generate_answer, generate_comparison  # توليد الإجابة عبر Groq LLM
from rag.loader import load_file           # قراءة ملفات PDF/TXT
from rag.retriever import load_from_disk, retrieve  # البحث في الـ vectors
from rag.reranker import rerank            # إعادة ترتيب النتائج
from rag.vectorstore import is_shared_loaded, upsert_chunks  # ChromaDB
from rag.article_lookup import lookup_articles  # بحث مباشر في نص المواد


# ══════════════════════════════════════════════════════════════
#  LOGGING — نظام السجلات لتتبع الأخطاء والأحداث
# ══════════════════════════════════════════════════════════════

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)  # أنشئ مجلد logs إذا لم يكن موجوداً

logging.basicConfig(
    level=logging.INFO,
    # شكل رسالة السجل: [الوقت] [المستوى] الرسالة
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        # احفظ السجلات في ملف app.log
        logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8"),
        # واطبعها في التيرمنال أيضاً
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# إخفاء سجلات المكتبات الخارجية غير المفيدة
for _noisy in ("httpx", "httpcore", "google", "google.auth", "google.genai", "urllib3"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)


# ══════════════════════════════════════════════════════════════
#  PATHS — مسارات الملفات المهمة
# ══════════════════════════════════════════════════════════════

DATA_DIR    = Path(__file__).parent.parent / "data"      # ملفات PDF الأصلية
CLEANED_DIR = DATA_DIR / "cleaned"                        # ملفات TXT بعد التنظيف
UPLOAD_DIR  = Path(__file__).parent / "uploads"          # ملفات رفعها المستخدم
UPLOAD_DIR.mkdir(exist_ok=True)

# عدد الرسائل السابقة المُرسلة مع كل سؤال (ذاكرة المحادثة)
# 4 أزواج = 8 رسائل سابقة (4 أسئلة + 4 أجوبة)
MEMORY_TURNS = 4


# ══════════════════════════════════════════════════════════════
#  STARTUP — ما يحدث عند تشغيل السيرفر
# ══════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    يُنفَّذ هذا الكود مرة واحدة عند بدء تشغيل السيرفر.
    المهام:
      1. إنشاء جداول قاعدة البيانات إن لم تكن موجودة
      2. تحميل الـ vectors المحفوظة من القرص
      3. إذا لم توجد vectors → قراءة الـ PDF وبناء الـ index من الصفر
    """
    # خطوة 1: أنشئ الجداول في SQLite
    Base.metadata.create_all(bind=engine)

    # خطوة 2: حاول تحميل الـ index المحفوظ مسبقاً
    load_from_disk()

    if not is_shared_loaded():
        # لا يوجد index محفوظ → بناء index جديد من الملفات

        # أفضّل ملفات TXT المنظفة، وإلا استخدم PDF مباشرة
        sources = sorted(CLEANED_DIR.glob("*.txt")) if CLEANED_DIR.exists() else []
        if not sources:
            sources = sorted(DATA_DIR.glob("*.pdf"))

        if sources:
            logger.info(f"Indexing {len(sources)} document(s)...")
            all_chunks = []
            for src in sources:
                # اقرأ الملف وحوّله لـ documents
                docs = load_file(str(src))
                # قطّع كل document لأجزاء صغيرة (chunks)
                all_chunks.extend(chunk_documents(docs))

            # احفظ الـ chunks في ChromaDB كـ vectors
            upsert_chunks(all_chunks, shared=True)
            logger.info(f"Indexed {len(all_chunks)} chunks.")
        else:
            logger.warning("No documents found to index.")
    else:
        logger.info("PDPL index ready.")

    yield  # السيرفر يعمل الآن... عند الإيقاف يكمل ما بعد yield


# ══════════════════════════════════════════════════════════════
#  FASTAPI APP — إعداد التطبيق
# ══════════════════════════════════════════════════════════════

app = FastAPI(title="PDPL RAG API", lifespan=lifespan)

# السماح للـ Frontend بإرسال طلبات للـ Backend
# بدون هذا سيرفض المتصفح الطلبات (CORS Error)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],   # السماح بكل أنواع الطلبات (GET, POST, DELETE...)
    allow_headers=["*"],   # السماح بكل الـ headers
)


# ══════════════════════════════════════════════════════════════
#  PDF VIEWER — عرض ملفات PDF مباشرة في المتصفح
# ══════════════════════════════════════════════════════════════

@app.get("/pdf/{filename:path}")
async def serve_pdf(filename: str):
    """
    يُرسل ملف PDF للمتصفح ليُعرض مباشرة.
    يُستخدم عند النقر على مصدر في رد المساعد.
    مثال: /pdf/pdpl.pdf#page=5
    """
    from urllib.parse import unquote, quote
    name = unquote(filename)  # فك ترميز الاسم العربي

    # خريطة الأسماء التوضيحية → الاسم الحقيقي للملف
    _REAL_NAMES = {
        "اللائحة التنفيذية لنظام حماية البيانات الشخصية.pdf": "pdpl.pdf",
        "لائحة نقل البيانات خارج المملكة.pdf": "لائحة+نقل+البيانات+خارج+المملكة.pdf",
    }
    name = _REAL_NAMES.get(name, name)

    # ابحث في مجلد uploads أولاً ثم data
    for directory in [UPLOAD_DIR, DATA_DIR]:
        candidate = directory / name
        if candidate.exists() and candidate.suffix.lower() == ".pdf":
            encoded = quote(name, safe="")
            return FileResponse(
                path=str(candidate),
                media_type="application/pdf",
                # inline: افتح في المتصفح بدلاً من تحميله
                headers={"Content-Disposition": f"inline; filename*=UTF-8''{encoded}"},
            )
    raise HTTPException(status_code=404, detail="الملف غير موجود")


# ══════════════════════════════════════════════════════════════
#  SCHEMAS — شكل البيانات القادمة من الـ Frontend
# ══════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    """بيانات السؤال القادم من صفحة الشات"""
    question: str            # نص السؤال
    session_id: Optional[int] = None  # رقم المحادثة (None = محادثة جديدة)


class SessionCreate(BaseModel):
    """بيانات إنشاء محادثة جديدة"""
    title: str = "محادثة جديدة"


# ══════════════════════════════════════════════════════════════
#  SESSIONS — إدارة المحادثات
# ══════════════════════════════════════════════════════════════

@app.get("/sessions")
def list_sessions(db: DBSession = Depends(get_db)):
    """
    جلب كل المحادثات مرتبة من الأحدث للأقدم.
    يُستخدم لعرض قائمة المحادثات في الـ Sidebar.
    """
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@app.post("/sessions")
def create_session(body: SessionCreate, db: DBSession = Depends(get_db)):
    """إنشاء محادثة جديدة في قاعدة البيانات"""
    session = ChatSession(title=body.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"Created session {session.id}: {session.title}")
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}


@app.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: DBSession = Depends(get_db)):
    """
    جلب كل رسائل محادثة معينة.
    يُستخدم عند فتح محادثة قديمة من الـ Sidebar.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    # جلب الرسائل مرتبة زمنياً من الأقدم للأحدث
    msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    return {
        "session": {"id": session.id, "title": session.title},
        "messages": [
            {
                "id": m.id,
                "role": m.role,           # "user" أو "assistant"
                "content": m.content,     # نص الرسالة
                "sources": json.loads(m.sources),  # المصادر (file + page)
                "created_at": m.created_at.isoformat(),
            }
            for m in msgs
        ],
    }


@app.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_db)):
    """
    حذف محادثة وكل رسائلها.
    يُستخدم عند الضغط على زر الحذف في الـ Sidebar.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    # احذف الرسائل أولاً ثم المحادثة (لتجنب خطأ Foreign Key)
    db.query(Message).filter(Message.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    logger.info(f"Deleted session {session_id}")
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════
#  CHAT — قلب النظام: استقبال السؤال وإنتاج الإجابة
# ══════════════════════════════════════════════════════════════

@app.post("/chat")
def chat(req: ChatRequest, db: DBSession = Depends(get_db)):
    """
    Pipeline كامل للإجابة على سؤال:

    1. تحقق من السؤال
    2. أنشئ محادثة جديدة إذا لم تكن موجودة
    3. جلب سجل المحادثة (ذاكرة السياق)
    4. تحقق من الـ Cache (إذا سُئل هذا السؤال من قبل)
    5. RAG Pipeline:
       a. retrieve: ابحث في ChromaDB عن أقرب 15 chunk
       b. rerank: رتّب أفضل 7 chunks بالـ reranker
       c. generate: أرسل للـ Groq LLM وانتظر الإجابة
    6. استخرج المصادر (اسم الملف + رقم الصفحة)
    7. احفظ السؤال والإجابة في قاعدة البيانات
    8. أرجع الإجابة والمصادر للـ Frontend
    """

    # تحقق أن السؤال ليس فارغاً
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    logger.info(f"Chat: session={req.session_id} | q={req.question[:80]}")

    # ── خطوة 2: جلب أو إنشاء محادثة ──────────────────────────
    session_id = req.session_id
    if not session_id:
        # محادثة جديدة: العنوان = أول 60 حرف من السؤال
        title = req.question[:60].strip()
        session = ChatSession(title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    else:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(404, "Session not found")

    # ── خطوة 3: جلب سجل المحادثة (ذاكرة السياق) ─────────────
    # نجلب آخر MEMORY_TURNS*2 رسالة (أسئلة + أجوبة)
    past = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(MEMORY_TURNS * 2)
        .all()
    )
    # نعكس الترتيب ليكون من الأقدم للأحدث
    history = [{"role": m.role, "content": m.content} for m in reversed(past)]

    # ── خطوة 4: تحقق من الـ Cache ────────────────────────────
    # الـ Cache يعمل فقط في أول سؤال (لا يوجد history)
    if not history:
        cached = query_cache.get(0, req.question)
        if cached:
            # السؤال موجود في الـ Cache → أرجع الإجابة المحفوظة مباشرة
            _save_exchange(db, session_id, req.question, cached["answer"], cached["sources"], session)
            return {**cached, "session_id": session_id}

    # ── خطوة 5: حفظ رسالة المستخدم قبل الـ LLM (لقياس وقت الاستجابة) ──
    db.add(Message(session_id=session_id, role="user", content=req.question))
    db.commit()

    # ── خطوة 6: RAG Pipeline ──────────────────────────────────

    # 6a: direct article lookup — إذا طُلبت مادة بعينها نرجع نصها مباشرة
    direct, sources = lookup_articles(req.question)
    if direct:
        _comparison_keywords = ['فرق', 'مقارنة', 'قارن', 'الفرق', 'مقارنه']
        if any(kw in req.question for kw in _comparison_keywords):
            comparison = generate_comparison(direct, req.question)
            answer = f"{direct}\n\nالفرق بين المادتين:\n{comparison}" if comparison else direct
        else:
            answer = direct
    else:
        # 6b: retrieve — ابحث في BM25 عن أقرب 15 chunk للسؤال
        chunks = retrieve(req.question, user_id=0, k=15)

        # 6c: rerank — رتّب أفضل 7 chunks بالـ reranker (Cross-Encoder)
        top_chunks = rerank(req.question, chunks, top_k=7)

        # 6d: generate — أرسل السؤال + السياق + التاريخ لـ Groq LLM
        answer = generate_answer(req.question, top_chunks, history=history)

    # ── خطوة 7: استخراج المصادر الفريدة ──────────────────────
    _FILE_DISPLAY = {
        "pdpl.pdf": "اللائحة التنفيذية لنظام حماية البيانات الشخصية.pdf",
        "ملف نظام حماية البيانات الشخصية.pdf": "ملف نظام حماية البيانات الشخصية.pdf",
        "لائحة+نقل+البيانات+خارج+المملكة.pdf": "لائحة نقل البيانات خارج المملكة.pdf",
    }
    if not direct:
        seen_pages = set()
        sources = []
        for c in top_chunks:
            page = c["metadata"]["page_number"]
            raw_file = c["metadata"]["file_name"]
            display_file = _FILE_DISPLAY.get(raw_file, raw_file)
            key = (display_file, page)
            if key not in seen_pages and len(sources) < 3:
                seen_pages.add(key)
                sources.append({
                    "file": display_file,
                    "page": page
                })

    result = {"answer": answer, "sources": sources}

    # احفظ في الـ Cache للاستخدام لاحقاً (فقط للأسئلة بدون history)
    if not history:
        query_cache.set(0, req.question, result)

    # ── خطوة 8: حفظ رد المساعد بعد الـ LLM ──────────────────
    db.add(Message(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources, ensure_ascii=False),
    ))
    session.updated_at = datetime.now(timezone.utc)
    db.commit()

    sources_str = " | ".join(f"{s['file']} ص{s['page']}" for s in sources) or "لا مصادر"
    logger.info(f"✓ session={session_id} | {sources_str}")

    # ── خطوة 9: إرجاع النتيجة للـ Frontend ───────────────────
    return {**result, "session_id": session_id}


def _save_exchange(db, session_id: int, question: str, answer: str, sources: list, session: ChatSession):
    """
    يحفظ سؤال المستخدم وإجابة المساعد في قاعدة البيانات.
    يُستدعى بعد كل محادثة.
    """
    # حفظ رسالة المستخدم
    db.add(Message(session_id=session_id, role="user", content=question))

    # حفظ رسالة المساعد مع المصادر بصيغة JSON
    db.add(Message(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources, ensure_ascii=False),
    ))

    # تحديث وقت آخر تعديل للمحادثة
    session.updated_at = datetime.now(timezone.utc)
    db.commit()


# ══════════════════════════════════════════════════════════════
#  ANALYTICS — إحصائيات الاستخدام للوحة التحليلات
# ══════════════════════════════════════════════════════════════

@app.get("/analytics")
def analytics(db: DBSession = Depends(get_db)):
    from datetime import timedelta

    today = datetime.now(timezone.utc).date()

    # ── الأعداد الأساسية ──────────────────────────────────────────
    total_sessions  = db.query(func.count(ChatSession.id)).scalar()
    total_messages  = db.query(func.count(Message.id)).scalar()
    total_questions = db.query(func.count(Message.id)).filter(Message.role == "user").scalar()
    total_assistant = db.query(func.count(Message.id)).filter(Message.role == "assistant").scalar()

    recent_questions = (
        db.query(Message.content)
        .filter(Message.role == "user")
        .order_by(Message.created_at.desc())
        .limit(10)
        .all()
    )

    # ── نشاط آخر 7 أيام ──────────────────────────────────────────
    DAY_AR = {0: 'الاثنين', 1: 'الثلاثاء', 2: 'الأربعاء',
              3: 'الخميس',  4: 'الجمعة',   5: 'السبت', 6: 'الأحد'}
    week_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        d0  = datetime(day.year, day.month, day.day, 0, 0, 0)
        d1  = datetime(day.year, day.month, day.day, 23, 59, 59)
        cnt = db.query(func.count(ChatSession.id)).filter(
            ChatSession.created_at >= d0,
            ChatSession.created_at <= d1,
        ).scalar()
        week_data.append({"day": DAY_AR[day.weekday()], "value": cnt})

    # ── تغيير أسبوع على أسبوع (للـ badges) ──────────────────────
    tw_start = datetime(*(today - timedelta(days=6)).timetuple()[:3])
    lw_start = datetime(*(today - timedelta(days=13)).timetuple()[:3])
    lw_end   = datetime(*(today - timedelta(days=7)).timetuple()[:3], 23, 59, 59)

    tw_sess = db.query(func.count(ChatSession.id)).filter(ChatSession.created_at >= tw_start).scalar()
    lw_sess = db.query(func.count(ChatSession.id)).filter(
        ChatSession.created_at >= lw_start, ChatSession.created_at <= lw_end).scalar()

    tw_q = db.query(func.count(Message.id)).filter(
        Message.role == "user", Message.created_at >= tw_start).scalar()
    lw_q = db.query(func.count(Message.id)).filter(
        Message.role == "user", Message.created_at >= lw_start, Message.created_at <= lw_end).scalar()

    def badge(new, old):
        if old == 0:
            return f"+{new}" if new > 0 else "0%"
        d = round((new - old) / old * 100)
        return f"+{d}%" if d >= 0 else f"{d}%"

    # ── نسبة الاستشهاد بالمصادر ──────────────────────────────────
    with_sources = db.query(func.count(Message.id)).filter(
        Message.role == "assistant",
        Message.sources != "[]",
        Message.sources != "",
    ).scalar()
    citation_rate = round((with_sources / total_assistant * 100) if total_assistant > 0 else 0)

    # ── نسبة النجاح (ردود بدون رسالة خطأ) ───────────────────────
    failed = db.query(func.count(Message.id)).filter(
        Message.role == "assistant",
        Message.content.like("%عذراً، حدث خطأ%"),
    ).scalar()
    success_rate = round(((total_assistant - failed) / total_assistant * 100) if total_assistant > 0 else 0)

    # ── متوسط وقت الاستجابة ──────────────────────────────────────
    msgs = (
        db.query(Message.session_id, Message.role, Message.created_at)
        .order_by(Message.session_id, Message.created_at)
        .all()
    )
    times, prev_user_t, prev_sid = [], None, None
    for m in msgs:
        if m.session_id != prev_sid:
            prev_user_t = None
            prev_sid = m.session_id
        if m.role == "user":
            prev_user_t = m.created_at
        elif m.role == "assistant" and prev_user_t:
            delta = (m.created_at - prev_user_t).total_seconds()
            if 0 < delta < 120:
                times.append(delta)
            prev_user_t = None
    avg_response_time = round(sum(times) / len(times), 1) if times else 0

    return {
        "total_sessions":    total_sessions,
        "total_messages":    total_messages,
        "total_questions":   total_questions,
        "recent_questions":  [q[0] for q in recent_questions],
        "week_data":         week_data,
        "sessions_badge":    badge(tw_sess, lw_sess),
        "questions_badge":   badge(tw_q, lw_q),
        "citation_rate":     citation_rate,
        "success_rate":      success_rate,
        "rag_usage":         citation_rate,
        "avg_response_time": avg_response_time,
    }


# ══════════════════════════════════════════════════════════════
#  UPLOAD — رفع ملفات PDF جديدة وإضافتها للـ index
# ══════════════════════════════════════════════════════════════

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    يستقبل ملف PDF/TXT/DOCX، يحفظه، ويضيفه لـ ChromaDB.
    بعد الرفع، يمكن للمستخدم السؤال عن محتواه فوراً.
    """
    # تحقق من نوع الملف
    ext = Path(file.filename).suffix.lower()
    if ext not in {".pdf", ".txt", ".docx"}:
        raise HTTPException(400, "Only PDF, TXT, DOCX files are allowed")

    # حفظ الملف على القرص
    save_path = UPLOAD_DIR / file.filename
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # قراءة الملف وتقطيعه وإضافته للـ index
    docs   = load_file(str(save_path))
    chunks = chunk_documents(docs)
    upsert_chunks(chunks, shared=True)
    logger.info(f"Uploaded {file.filename}: {len(chunks)} chunks")

    return {"message": f"Indexed {len(chunks)} chunks from {file.filename}"}


# ══════════════════════════════════════════════════════════════
#  DEBUG — نقاط تشخيص المشاكل (للمطورين فقط)
# ══════════════════════════════════════════════════════════════

@app.get("/debug/env")
def debug_env():
    """التحقق من أن الـ API Key محمّل صحيحاً"""
    key = os.getenv("GEMINI_API_KEY", "NOT_SET")
    return {"key_prefix": key[:12] + "...", "key_len": len(key)}


@app.get("/debug/index")
def debug_index(q: str = None):
    """
    اختبار الـ RAG index:
    - كم عدد الـ chunks المحفوظة؟
    - هل البحث يُرجع نتائج؟
    """
    from rag.retriever import _indexes
    info = {k: {"num_chunks": len(v["chunks"])} for k, v in _indexes.items()}
    query = q or "نظام حماية البيانات الشخصية"
    raw_chunks = retrieve(query, user_id=0, k=5)
    return {
        "indexes":       info,
        "test_query":    query,
        "results_count": len(raw_chunks),
        "pages":         [c["metadata"]["page_number"] for c in raw_chunks],
        "top_preview":   raw_chunks[0]["content"][:150] if raw_chunks else None,
    }


@app.post("/debug/clear-cache")
def clear_cache():
    """مسح الـ Cache وإعادة بناء الـ BM25 index من الملفات المحدّثة."""
    query_cache._store.clear()

    # Clear BM25 in-memory index
    from rag.retriever import _indexes
    _indexes.clear()

    # Rebuild from cleaned TXT files
    sources = sorted(CLEANED_DIR.glob("*.txt")) if CLEANED_DIR.exists() else []
    if not sources:
        sources = sorted(DATA_DIR.glob("*.pdf"))
    if sources:
        all_chunks = []
        for src in sources:
            docs = load_file(str(src))
            all_chunks.extend(chunk_documents(docs))
        upsert_chunks(all_chunks, shared=True)

    return {"cleared": True, "reindexed": len(sources)}
