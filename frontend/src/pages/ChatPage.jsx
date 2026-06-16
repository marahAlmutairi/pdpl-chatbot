import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { API_BASE_URL, deleteSession, getSessionMessages, getSessions, sendMessage } from '../services/api'
import PdfViewerModal from '../components/PdfViewerModal'

const FILE_NAMES = {
  'pdpl':     'نظام حماية البيانات الشخصية',
  'pdpl.pdf': 'نظام حماية البيانات الشخصية',
}

function friendlyName(raw) {
  const clean = raw.replace(/\+/g, ' ').replace(/\.pdf$/i, '').trim()
  return FILE_NAMES[clean.toLowerCase()] || FILE_NAMES[raw.toLowerCase()] || clean
}

const SUGGESTIONS = [
  {
    text: 'ما هي حقوق صاحب البيانات الشخصية وفق نظام PDPL؟',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#2F6F5F"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/></svg>,
    bg: '#eef6f2',
  },
  {
    text: 'ما هي شروط نقل البيانات الشخصية خارج المملكة؟',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    bg: '#f4f2fe',
  },
  {
    text: 'ما هي التزامات الجهات المسؤولة عن معالجة البيانات الشخصية وفق نظام PDPL؟',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    bg: '#eef6f2',
  },
  {
    text: 'ما هي إجراءات الإبلاغ عن اختراق البيانات الشخصية وفق نظام PDPL؟',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    bg: '#fff8ee',
  },
]

function LogoIcon() {
  return (
    <svg width="56" height="62" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg" x1="20" y1="0" x2="180" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B3578"/>
          <stop offset="100%" stopColor="#3ECF8E"/>
        </linearGradient>
      </defs>
      {/* Outer shield */}
      <path d="M100 8 L182 42 V112 C182 158 148 194 100 213 C52 194 18 158 18 112 V42 Z" stroke="url(#lg)" strokeWidth="3" fill="none"/>
      {/* Inner shield */}
      <path d="M100 22 L168 52 V110 C168 149 138 181 100 197 C62 181 32 149 32 110 V52 Z" stroke="url(#lg)" strokeWidth="1.8" fill="none"/>
      {/* Lock shackle */}
      <path d="M85 88 V72 C85 61 115 61 115 72 V88" stroke="url(#lg)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Lock body */}
      <rect x="74" y="87" width="52" height="38" rx="6" stroke="url(#lg)" strokeWidth="2.5" fill="none"/>
      {/* Keyhole circle */}
      <circle cx="100" cy="104" r="5" stroke="url(#lg)" strokeWidth="2" fill="none"/>
      <line x1="100" y1="109" x2="100" y2="117" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
      {/* Database */}
      <ellipse cx="100" cy="142" rx="22" ry="7" stroke="url(#lg)" strokeWidth="2" fill="none"/>
      <line x1="78" y1="142" x2="78" y2="162" stroke="url(#lg)" strokeWidth="2"/>
      <line x1="122" y1="142" x2="122" y2="162" stroke="url(#lg)" strokeWidth="2"/>
      <path d="M78 152 Q100 158 122 152" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <ellipse cx="100" cy="162" rx="22" ry="7" stroke="url(#lg)" strokeWidth="2" fill="none"/>
      {/* Circuit left */}
      <line x1="74" y1="96" x2="56" y2="96" stroke="url(#lg)" strokeWidth="1.5"/>
      <line x1="56" y1="96" x2="56" y2="114" stroke="url(#lg)" strokeWidth="1.5"/>
      <circle cx="56" cy="114" r="3.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <line x1="56" y1="104" x2="44" y2="104" stroke="url(#lg)" strokeWidth="1.5"/>
      <rect x="36" y="100" width="8" height="8" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <circle cx="67" cy="96" r="2.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <rect x="38" y="82" width="7" height="7" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <line x1="45" y1="85" x2="55" y2="85" stroke="url(#lg)" strokeWidth="1.5"/>
      <line x1="41" y1="82" x2="41" y2="75" stroke="url(#lg)" strokeWidth="1.5"/>
      <circle cx="41" cy="72" r="2.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      {/* Circuit right */}
      <line x1="126" y1="96" x2="144" y2="96" stroke="url(#lg)" strokeWidth="1.5"/>
      <line x1="144" y1="96" x2="144" y2="114" stroke="url(#lg)" strokeWidth="1.5"/>
      <circle cx="144" cy="114" r="3.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <line x1="144" y1="104" x2="156" y2="104" stroke="url(#lg)" strokeWidth="1.5"/>
      <rect x="156" y="100" width="8" height="8" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <circle cx="133" cy="96" r="2.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <rect x="155" y="82" width="7" height="7" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      <line x1="148" y1="85" x2="155" y2="85" stroke="url(#lg)" strokeWidth="1.5"/>
      <line x1="159" y1="82" x2="159" y2="75" stroke="url(#lg)" strokeWidth="1.5"/>
      <circle cx="159" cy="72" r="2.5" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
      {/* ── Saudi National Emblem ── */}
      {/* Trunk */}
      <line x1="100" y1="178" x2="100" y2="203" stroke="url(#lg)" strokeWidth="2.2" strokeLinecap="round"/>
      {/* Fronds — fan spread like Saudi emblem */}
      {/* Center up */}
      <path d="M100 178 C100 172 100 166 100 162" stroke="url(#lg)" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
      {/* Upper-left 1 */}
      <path d="M100 179 C97 172 91 167 85 165" stroke="url(#lg)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Upper-right 1 */}
      <path d="M100 179 C103 172 109 167 115 165" stroke="url(#lg)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Left spread */}
      <path d="M100 180 C94 175 86 173 79 174" stroke="url(#lg)" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      {/* Right spread */}
      <path d="M100 180 C106 175 114 173 121 174" stroke="url(#lg)" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      {/* Far-left drooping */}
      <path d="M100 181 C91 180 83 182 77 186" stroke="url(#lg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Far-right drooping */}
      <path d="M100 181 C109 180 117 182 123 186" stroke="url(#lg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Lower-left drooping */}
      <path d="M100 182 C90 184 82 188 77 193" stroke="url(#lg)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* Lower-right drooping */}
      <path d="M100 182 C110 184 118 188 123 193" stroke="url(#lg)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* Sword 1 blade — lower-left to upper-right */}
      <line x1="74" y1="214" x2="122" y2="196" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
      {/* Sword 1 crossguard */}
      <line x1="70" y1="210" x2="78" y2="218" stroke="url(#lg)" strokeWidth="1.9" strokeLinecap="round"/>
      {/* Sword 2 blade — lower-right to upper-left */}
      <line x1="126" y1="214" x2="78" y2="196" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
      {/* Sword 2 crossguard */}
      <line x1="130" y1="210" x2="122" y2="218" stroke="url(#lg)" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  )
}
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
      <line x1="6" y1="12" x2="10" y2="12"/>
      <line x1="8" y1="10" x2="8" y2="14"/>
      <circle cx="16" cy="11" r="1" fill="currentColor"/>
      <circle cx="18" cy="13" r="1" fill="currentColor"/>
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
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
function AttachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
    </svg>
  )
}

export default function ChatPage() {
  const navigate = useNavigate()
  const [sessions, setSessions]               = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages]               = useState([])
  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [search, setSearch]                   = useState('')
  const [pdfModal, setPdfModal]               = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadSessions()
    const init = sessionStorage.getItem('hp_init_msg')
    if (init) { sessionStorage.removeItem('hp_init_msg'); setTimeout(() => handleSend(init), 400) }
  }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const loadSessions = async () => {
    try { const r = await getSessions(); setSessions(r.data) } catch {}
  }

  const handleNewChat = () => { setActiveSessionId(null); setMessages([])
    // auto-send initial message from homepage if any
    const init = sessionStorage.getItem('hp_init_msg')
    if (init) { sessionStorage.removeItem('hp_init_msg'); setTimeout(() => handleSend(init), 200) }
  }

  const handleSelectSession = async (id) => {
    if (id === activeSessionId) return
    setActiveSessionId(id)
    try {
      const r = await getSessionMessages(id)
      setMessages(r.data.messages.map(m => ({ role: m.role, text: m.content, sources: m.sources })))
    } catch {}
  }

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteSession(id)
      setSessions(p => p.filter(s => s.id !== id))
      if (activeSessionId === id) { setActiveSessionId(null); setMessages([]) }
    } catch {}
  }

  const handleSend = async (question) => {
    const q = (question || input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(p => [...p, { role: 'user', text: q }])
    setLoading(true)
    try {
      const r = await sendMessage(q, activeSessionId)
      if (!activeSessionId) setActiveSessionId(r.data.session_id)
      setMessages(p => [...p, { role: 'assistant', text: r.data.answer, sources: r.data.sources }])
      loadSessions()
    } catch (err) {
      const msg = err.response?.data?.detail || 'حدث خطأ في الاتصال بالخادم'
      setMessages(p => [...p, { role: 'assistant', text: `⚠️ ${msg}`, sources: [] }])
    } finally { setLoading(false) }
  }

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="chat-layout">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="logo" className="sidebar-logo" />
          <div>
            <div className="brand-name">المساعد الذكي</div>
            <div className="brand-sub">نظام حماية البيانات PDPL</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          + محادثة جديدة
        </button>


        <input
          className="sidebar-search"
          placeholder="ابحث في المحادثات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="sidebar-history">
          <div className="section-label">آخر المحادثات</div>
          <div className="sessions-list">
            {filteredSessions.length === 0 && (
              <p className="sessions-empty">لا توجد محادثات بعد</p>
            )}
            {filteredSessions.map(s => (
              <div
                key={s.id}
                className={`session-item ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => handleSelectSession(s.id)}
              >
                <span className="session-icon"><ChatIcon /></span>
                <span className="session-title">{s.title}</span>
                <button className="session-delete" onClick={e => handleDeleteSession(e, s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="analytics-btn" onClick={() => navigate('/')}>
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

      {/* ── Main ── */}
      <main className="chat-main">

        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="suggestions-grid">
                {SUGGESTIONS.map((s, i) => (
                  <div key={i} onClick={() => handleSend(s.text)} style={{
                    background: '#FFFFFF',
                    border: '1px solid #E6ECE8',
                    borderRadius: 18,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EDE9FE'; e.currentTarget.style.borderColor = '#8B7CF6'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,124,246,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E6ECE8'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: s.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {s.icon}
                    </div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937', lineHeight: 1.65, margin: 0, textAlign: 'right' }}>
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              <div className="bubble">
                <div className="bubble-text">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.sources?.length > 0 && (
                  <div className="sources">
                    <span className="sources-label">📚 المصادر:</span>
                    <div className="sources-list">
                      {msg.sources.map((s, j) => (
                        <button
                          key={j}
                          className="source-chip"
                          onClick={() => setPdfModal({
                            fileUrl: `${API_BASE_URL}/pdf/${encodeURIComponent(s.file)}`,
                            page: s.page,
                            title: friendlyName(s.file),
                          })}
                          title={`افتح ${friendlyName(s.file)} — صفحة ${s.page}`}
                        >
                          📄 {friendlyName(s.file)} — ص {s.page}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg-row assistant">
              <div className="bubble typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-bar">
          <div className="input-wrap">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="اسأل عن أي بند في نظام حماية البيانات الشخصية..."
              disabled={loading}
            />
            <button className="send-btn" onClick={() => handleSend()}>
              <SendIcon />
            </button>
          </div>
        </div>
      </main>

      {pdfModal && (
        <PdfViewerModal
          fileUrl={pdfModal.fileUrl}
          pageNumber={pdfModal.page}
          title={pdfModal.title}
          onClose={() => setPdfModal(null)}
        />
      )}
    </div>
  )
}
