import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions, deleteSession } from '../services/api'

/* ── Icons ──────────────────────────────────────────────── */
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}
function GameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="4"/>
      <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
      <circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  )
}
/* ── Section icons ──────────────────────────────────────── */
function IcoBook()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> }
function IcoScale()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l9-2 9 2"/><path d="M6 9l-3 6a3 3 0 006 0L6 9z"/><path d="M18 9l-3 6a3 3 0 006 0L18 9z"/></svg> }
function IcoSearch() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IcoShield() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IcoGame()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="16" cy="11" r="1" fill="#2F6F5F"/><circle cx="18" cy="13" r="1" fill="#2F6F5F"/></svg> }
function IcoTarget() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function IcoAward()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg> }

function ShieldSvg({ size = 20, color = '#2F6F5F' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/>
    </svg>
  )
}
function DocSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function CheckSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )
}
function AlertSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

/* ── Data ───────────────────────────────────────────────── */
const BADGES = [
  { icon: <IcoBook />,   label: 'إجابات مدعومة بالمصادر' },
  { icon: <IcoScale />,  label: 'متخصص في نظام PDPL' },
  { icon: <IcoSearch />, label: 'بحث ذكي داخل المراجع القانونية' },
  { icon: <IcoShield />, label: 'تعزيز الوعي بحماية البيانات' },
  { icon: <IcoGame />,   label: 'لعبة توعوية تفاعلية' },
]

const QUESTIONS = [
  { text: 'ما هي حقوق صاحب البيانات الشخصية وفق نظام PDPL؟',          icon: <ShieldSvg />, bg: '#eef6f2' },
  { text: 'ما هي شروط نقل البيانات الشخصية خارج المملكة؟',             icon: <DocSvg />,   bg: '#f4f2fe' },
  { text: 'ما هي التزامات الجهات المسؤولة عن معالجة البيانات الشخصية؟', icon: <CheckSvg />, bg: '#eef6f2' },
  { text: 'ما هي إجراءات الإبلاغ عن اختراق البيانات الشخصية؟',          icon: <AlertSvg />, bg: '#fff8ee' },
]

const GAME_FEATURES = [
  { icon: <IcoTarget />, title: 'أسئلة تفاعلية',       desc: 'سيناريوهات واقعية من حياتك الرقمية' },
  { icon: <IcoShield />, title: 'سيناريوهات واقعية',  desc: 'مستوحاة من أحكام نظام PDPL' },
  { icon: <IcoBook />,   title: 'تعلم من الأخطاء',     desc: 'شرح مفصّل لكل إجابة' },
  { icon: <IcoAward />,  title: 'تعزيز الوعي الرقمي', desc: 'نظام نقاط يقيّم مستوى وعيك' },
]

const TECHS = [
  { name: 'React + Vite',          color: '#CFE7DF' },
  { name: 'FastAPI',               color: '#EDE9FE' },
  { name: 'Groq LLM',              color: '#CFE7DF' },
  { name: 'RAG System',            color: '#EDE9FE' },
  { name: 'ChromaDB',              color: '#CFE7DF' },
  { name: 'BM25 Hybrid Search',    color: '#EDE9FE' },
  { name: 'PDF Knowledge Base',    color: '#CFE7DF' },
  { name: 'Sentence Transformers', color: '#EDE9FE' },
]

const TRUST = [
  { icon: <IcoBook />,   title: 'يعتمد على مصادر قانونية معتمدة',           desc: 'كل إجابة مرتبطة بمرجع من الوثيقة الرسمية لنظام PDPL' },
  { icon: <IcoSearch />, title: 'يسترجع المعلومات من الملفات القانونية',    desc: 'نظام RAG يضمن دقة المعلومات وصحتها القانونية' },
  { icon: <IcoScale />,  title: 'متخصص في نظام حماية البيانات الشخصية',   desc: 'مبني حصراً على وثائق PDPL الرسمية السعودية' },
  { icon: <IcoShield />, title: 'يساهم في تعزيز الوعي القانوني',           desc: 'يجمع بين المساعد الذكي والتعليم التفاعلي' },
]

const OBJECTIVES = [
  'نشر الوعي بحماية البيانات الشخصية',
  'تسهيل الوصول للمعلومات القانونية',
  'توفير إجابات مدعومة بالمصادر',
  'تعزيز التعلم التفاعلي',
  'رفع مستوى الثقافة الرقمية',
]

/* ── Reusable section title ──────────────────────────────── */
function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 36 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', margin: 0 }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 1.7 }}>{subtitle}</p>
      )}
      <div style={{ width: 48, height: 3, background: 'linear-gradient(90deg,#2F6F5F,#8B7CF6)', borderRadius: 10, margin: '12px auto 0' }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const navigate = useNavigate()
  const [sessions, setSessions]     = useState([])
  const [search,   setSearch]       = useState('')
  const [input,    setInput]        = useState('')
  const [hoveredQ, setHoveredQ]     = useState(null)
  const [hoveredB, setHoveredB]     = useState(null)

  useEffect(() => {
    getSessions().then(r => setSessions(r.data)).catch(() => {})
  }, [])

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation()
    try { await deleteSession(id); setSessions(p => p.filter(s => s.id !== id)) } catch {}
  }

  const handleSend = (msg) => {
    const q = (msg || input).trim()
    if (!q) return
    sessionStorage.setItem('hp_init_msg', q)
    navigate('/chat')
  }

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  /* shared styles */
  const section = {
    padding: '56px 48px',
  }
  const card = {
    background: '#FFFFFF',
    border: '1px solid #E6ECE8',
    borderRadius: 18,
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  }

  return (
    <div className="chat-layout" style={{ direction: 'rtl' }}>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="sidebar" style={{ background: '#FFFFFF', borderLeft: '1px solid #E6ECE8' }}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="logo" className="sidebar-logo" />
          <div>
            <div className="brand-name">المساعد الذكي</div>
            <div className="brand-sub">نظام حماية البيانات PDPL</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={() => navigate('/chat')}>
          + محادثة جديدة
        </button>

        <input className="sidebar-search" placeholder="ابحث في المحادثات..."
          value={search} onChange={e => setSearch(e.target.value)} />

        <div className="sidebar-history">
          <div className="section-label">آخر المحادثات</div>
          <div className="sessions-list">
            {filtered.length === 0 && <p className="sessions-empty">لا توجد محادثات بعد</p>}
            {filtered.map(s => (
              <div key={s.id} className="session-item" onClick={() => navigate('/chat')}>
                <span className="session-icon"><ChatIcon /></span>
                <span className="session-title">{s.title}</span>
                <button className="session-delete" onClick={e => handleDeleteSession(e, s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="analytics-btn active">
            <InfoIcon /> عن المساعد الذكي
          </button>
          <button className="analytics-btn" onClick={() => navigate('/game')}>
            <GameIcon /> حارس هويتك
          </button>
          <button className="analytics-btn" onClick={() => navigate('/analytics')}>
            <BarChartIcon /> لوحة التحليلات
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#F8FAF9', direction: 'rtl' }}>

        {/* ── HERO ── */}
        <section style={{
          ...section,
          background: '#F8FAF9',
          paddingBottom: 64,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>

            <h1 style={{
              fontSize: 34, fontWeight: 900, color: '#1F2937',
              lineHeight: 1.4, margin: '0 0 20px', letterSpacing: '-0.5px',
            }}>
              مرحباً بك في{' '}
              <span style={{ color: '#2F6F5F' }}>المساعد الذكي</span>
              {' '}لحماية البيانات
            </h1>

            <p style={{
              fontSize: 15, color: '#6B7280', lineHeight: 1.9,
              maxWidth: 680, margin: '0 auto 36px',
            }}>
              منصة ذكية متخصصة في نظام حماية البيانات الشخصية (PDPL) بالمملكة العربية السعودية،
              تجمع بين الذكاء الاصطناعي والتوعية الرقمية لتقديم معلومات قانونية دقيقة ومدعومة
              بالمصادر الرسمية، بالإضافة إلى تجربة تعليمية تفاعلية.
            </p>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/chat')} style={{
                background: 'transparent', color: '#1B6B43',
                border: '2px solid #1B6B43',
                borderRadius: 50, padding: '13px 40px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1B6B43'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B6B43' }}>
                + ابدأ المحادثة
              </button>
              <button onClick={() => navigate('/game')} style={{
                background: 'transparent', color: '#1B6B43',
                border: '2px solid #1B6B43',
                borderRadius: 50, padding: '13px 40px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1B6B43'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B6B43' }}>
                جرّب اللعبة
              </button>
            </div>
          </div>
        </section>

        {/* ── BADGES ── */}
        <section style={{ padding: '36px 48px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {BADGES.map((b, i) => (
              <div key={i}
                onMouseEnter={() => setHoveredB(i)}
                onMouseLeave={() => setHoveredB(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: hoveredB === i ? '#EDE9FE' : '#FFFFFF',
                  border: `1px solid ${hoveredB === i ? '#8B7CF6' : '#E6ECE8'}`,
                  borderRadius: 50, padding: '9px 20px',
                  fontSize: 13, fontWeight: 600, color: '#1F2937',
                  cursor: 'default',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                }}>
                {b.icon}
                {b.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── QUICK QUESTIONS ── */}
        <section style={section}>
          <SectionTitle title="أسئلة شائعة" subtitle="اختر سؤالاً أو اكتب سؤالك الخاص أدناه" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900, margin: '0 auto' }}>
            {QUESTIONS.map((q, i) => (
              <div key={i}
                onMouseEnter={() => setHoveredQ(i)}
                onMouseLeave={() => setHoveredQ(null)}
                onClick={() => handleSend(q.text)}
                style={{
                  ...card,
                  padding: '20px 22px',
                  cursor: 'pointer',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  background: hoveredQ === i ? '#EDE9FE' : '#FFFFFF',
                  border: `1px solid ${hoveredQ === i ? '#8B7CF6' : '#E6ECE8'}`,
                  transform: hoveredQ === i ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hoveredQ === i ? '0 8px 24px rgba(139,124,246,0.15)' : '0 2px 12px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: hoveredQ === i ? 'rgba(139,124,246,0.1)' : q.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {q.icon}
                </div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937', lineHeight: 1.65, margin: 0 }}>
                  {q.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CHAT INPUT ── */}
        <section style={{ padding: '0 48px 56px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="input-wrap">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="اسأل أي سؤال يتعلق بنظام حماية البيانات الشخصية..."
              />
              <button className="send-btn" onClick={() => handleSend()}>
                <SendIcon />
              </button>
            </div>
          </div>
        </section>

        {/* ── GAME SECTION ── */}
        <section style={{ ...section, background: '#F8FAF9', paddingTop: 56, paddingBottom: 56 }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <SectionTitle
              title="حارس هويتك"
              subtitle="تعلم واحمِ بياناتك بطريقة تفاعلية ممتعة"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              {/* Description card */}
              <div style={{ ...card, padding: '28px 26px', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.9, margin: 0, textAlign: 'center' }}>
                  لعبة توعوية تفاعلية تهدف إلى تعزيز الوعي بمفاهيم حماية البيانات الشخصية من خلال سيناريوهات
                  واقعية مستوحاة من نظام PDPL، مما يساعد المستخدم على اكتساب المعرفة القانونية بطريقة تعليمية مبتكرة.
                </p>
              </div>

              {/* Feature cards */}
              {GAME_FEATURES.map((f, i) => (
                <div key={i} style={{ ...card, padding: '22px 22px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#CFE7DF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => navigate('/game')} style={{
                background: 'transparent', color: '#1B6B43',
                border: '2px solid #1B6B43',
                borderRadius: 50, padding: '13px 42px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1B6B43'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B6B43' }}>
                ابدأ اللعبة
              </button>
            </div>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section style={section}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <SectionTitle title="لماذا تثق بالمساعد الذكي؟" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {TRUST.map((t, i) => (
                <div key={i} style={{ ...card, padding: '22px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#CFE7DF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {t.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.65 }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section style={{ ...section, background: '#F8FAF9' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
            <div>
              <SectionTitle title="عن المساعد الذكي" />
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.9, margin: '0 0 18px' }}>
                المساعد الذكي لحماية البيانات هو منصة توعوية ذكية تم تطويرها للمساهمة في نشر الوعي بنظام حماية البيانات الشخصية في المملكة العربية السعودية.
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.9, margin: 0 }}>
                يعتمد النظام على تقنيات الذكاء الاصطناعي واسترجاع المعلومات (RAG) لتقديم إجابات قانونية دقيقة ومدعومة بالمصادر القانونية المعتمدة.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>أهداف المنصة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {OBJECTIVES.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#CFE7DF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#1F2937', fontWeight: 500 }}>{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TECHNOLOGIES ── */}
        <section style={section}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <SectionTitle title="التقنيات المستخدمة" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {TECHS.map((t, i) => (
                <div key={i} style={{
                  ...card, padding: '18px 16px', textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EDE9FE'; e.currentTarget.style.borderColor = '#8B7CF6' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E6ECE8' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: t.color, margin: '0 auto 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* bottom spacer */}
        <div style={{ height: 32 }} />

      </main>
    </div>
  )
}
