import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell, LabelList,
} from 'recharts'
import { deleteSession, getAnalytics, getSessions } from '../services/api'

const WEEK_LOADING = [
  { day: 'الاثنين', value: 0 }, { day: 'الثلاثاء', value: 0 },
  { day: 'الأربعاء', value: 0 }, { day: 'الخميس', value: 0 },
  { day: 'الجمعة', value: 0 },  { day: 'السبت', value: 0 },
  { day: 'الأحد', value: 0 },
]

const TOPIC_COLORS = ['#2F6F5F','#4E9F8A','#78B8A8','#9CCFC0','#BEE1D6','#C2DDD5']

// مؤشرات الأداء — تُبنى من البيانات الحقيقية في الـ component

/* ── Sidebar icons ─────────────────────────────────────── */
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

/* ── Stat card icons ───────────────────────────────────── */
function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function IconTrend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B7CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  )
}
function InfoIconA() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

/* ── Custom tooltips ───────────────────────────────────── */
const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E6ECE8',
      borderRadius: 10, padding: '8px 14px',
      fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      fontFamily: 'Cairo, sans-serif',
    }}>
      <div style={{ color: '#6B7280', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#2F6F5F', fontWeight: 700 }}>{payload[0].value} محادثة</div>
    </div>
  )
}

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E6ECE8',
      borderRadius: 10, padding: '8px 14px',
      fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      fontFamily: 'Cairo, sans-serif',
    }}>
      <div style={{ color: '#2F6F5F', fontWeight: 700 }}>{payload[0].value} بحث</div>
    </div>
  )
}

/* ── Gauge icon for section header ────────────────────── */
function IconGauge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      <path d="M12 6v2"/>
      <path d="M6.34 7.76l1.42 1.42"/>
      <path d="M4 12h2"/>
      <path d="M12 14l3.09-5.09"/>
      <circle cx="12" cy="14" r="1" fill="#2F6F5F"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [sessions, setSessions]   = useState([])
  const [search, setSearch]       = useState('')

  useEffect(() => {
    getAnalytics().then(r => setAnalytics(r.data)).catch(() => {})
    getSessions().then(r => setSessions(r.data)).catch(() => {})
  }, [])

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation()
    try { await deleteSession(id); setSessions(p => p.filter(s => s.id !== id)) } catch {}
  }

  const weekData = analytics?.week_data ?? WEEK_LOADING

  const topicData = analytics?.recent_questions?.length
    ? (() => {
        const topics = {}
        analytics.recent_questions.forEach(q => {
          const key = q.length > 14 ? q.slice(0, 14) + '...' : q
          topics[key] = (topics[key] || 0) + 1
        })
        return Object.entries(topics)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }))
      })()
    : []

  const stats = [
    {
      label: 'إجمالي المحادثات',
      value: analytics?.total_sessions ?? '—',
      icon: <IconChat />,
      badge: analytics?.sessions_badge ?? '—',
      desc: 'جلسة محادثة مسجلة',
      cardBg: 'linear-gradient(145deg, rgba(47,111,95,0.07) 0%, rgba(139,124,246,0.04) 100%)',
      iconBg: 'linear-gradient(135deg, #CFE7DF 0%, #ddd9fd 100%)',
    },
    {
      label: 'الأسئلة المُجابة',
      value: analytics?.total_questions ?? '—',
      icon: <IconDoc />,
      badge: analytics?.questions_badge ?? '—',
      desc: 'استفسار قانوني تمت إجابته',
      cardBg: 'linear-gradient(145deg, rgba(139,124,246,0.07) 0%, rgba(47,111,95,0.04) 100%)',
      iconBg: 'linear-gradient(135deg, #EDE9FE 0%, #CFE7DF 100%)',
    },
  ]

  const performance = [
    {
      iconEl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
      iconBg: 'linear-gradient(135deg, #CFE7DF 0%, #ddd9fd 100%)',
      cardBg: 'linear-gradient(145deg, rgba(47,111,95,0.07) 0%, rgba(139,124,246,0.04) 100%)',
      barGrad: 'linear-gradient(90deg, #2F6F5F, #8B7CF6)',
      value: analytics ? String(analytics.citation_rate) : '—',
      unit: '%',
      label: 'دقة الاستشهاد بالمصادر',
      desc: 'نسبة الإجابات المدعومة بمصادر مسترجعة من الملفات القانونية.',
      note: 'يعكس مدى موثوقية الإجابات وربطها بالمصادر الأصلية.',
      progress: analytics?.citation_rate ?? 0,
      accent: '#2F6F5F',
    },
    {
      iconEl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
      iconBg: 'linear-gradient(135deg, #EDE9FE 0%, #CFE7DF 100%)',
      cardBg: 'linear-gradient(145deg, rgba(139,124,246,0.08) 0%, rgba(47,111,95,0.04) 100%)',
      barGrad: 'linear-gradient(90deg, #8B7CF6, #4E9F8A)',
      value: analytics ? String(analytics.success_rate) : '—',
      unit: '%',
      label: 'نسبة الإجابات الناجحة',
      desc: 'نسبة الأسئلة التي أجاب عنها النظام بنجاح بدون أخطاء اتصال.',
      note: 'يقيس استقرار النظام وموثوقية الاتصال بنماذج الذكاء الاصطناعي.',
      progress: analytics?.success_rate ?? 0,
      accent: '#2F6F5F',
    },
    {
      iconEl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E9F8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
      iconBg: 'linear-gradient(135deg, #CFE7DF 0%, #EDE9FE 100%)',
      cardBg: 'linear-gradient(145deg, rgba(78,159,138,0.07) 0%, rgba(139,124,246,0.05) 100%)',
      barGrad: 'linear-gradient(90deg, #4E9F8A, #8B7CF6)',
      value: analytics ? String(analytics.rag_usage) : '—',
      unit: '%',
      label: 'استخدام الملفات المرجعية',
      desc: 'نسبة الإجابات التي اعتمدت على الملفات القانونية المرفوعة.',
      note: 'يعكس فعالية نظام RAG في استرجاع المعلومات من المصادر.',
      progress: analytics?.rag_usage ?? 0,
      accent: '#4E9F8A',
    },
    {
      iconEl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      iconBg: 'linear-gradient(135deg, #CFE7DF 0%, #EDE9FE 100%)',
      cardBg: 'linear-gradient(145deg, rgba(47,111,95,0.07) 0%, rgba(139,124,246,0.05) 100%)',
      barGrad: null,
      value: analytics ? (analytics.avg_response_time > 0 ? String(analytics.avg_response_time) : '—') : '—',
      unit: analytics?.avg_response_time > 0 ? 'ثانية' : '',
      label: 'متوسط زمن الاستجابة',
      desc: 'متوسط الوقت المستغرق من استقبال السؤال حتى إرجاع الإجابة.',
      note: 'يقيس سرعة وكفاءة النظام في تقديم الخدمة للمستخدم.',
      progress: null,
      accent: '#2F6F5F',
    },
  ]

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  /* ── shared card style ── */
  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E6ECE8',
    borderRadius: '18px',
    boxShadow: '0 4px 18px rgba(0,0,0,0.05)',
  }

  return (
    <div className="chat-layout">

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
              <div key={s.id} className="session-item" onClick={() => navigate('/')}>
                <span className="session-icon"><ChatIcon /></span>
                <span className="session-title">{s.title}</span>
                <button className="session-delete" onClick={e => handleDeleteSession(e, s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="analytics-btn" onClick={() => navigate('/')}>
            <InfoIconA /> عن المساعد الذكي
          </button>
          <button className="analytics-btn" onClick={() => navigate('/game')}>
            <GameIcon /> حارس هويتك
          </button>
          <button className="analytics-btn active">
            <BarChartIcon /> لوحة التحليلات
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <main className="analytics-main" style={{ background: '#F8FAF9' }}>

        {/* ── Header ── */}
        <div
          className="chat-header"
          style={{
            background: 'rgba(248,250,249,0.95)',
            borderBottom: '1px solid #E6ECE8',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px 36px',
          }}
        >
          <div style={{ fontSize: '19px', fontWeight: 700, color: '#1F2937', letterSpacing: '-0.3px' }}>
            لوحة التحليلات
          </div>
          <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: '5px', lineHeight: 1.6 }}>
            نظرة شاملة على أداء واستخدام المستشار القانوني لنظام حماية البيانات الشخصية
          </div>
        </div>

        {/* ── Body ── */}
        <div className="analytics-body">

          {/* ── Statistics Cards ── */}
          <div className="stats-grid">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>

          {/* ── Charts ── */}
          <div className="charts-grid">

            {/* Weekly Activity — Area Chart */}
            <div style={{ background: 'linear-gradient(145deg, rgba(47,111,95,0.06) 0%, rgba(139,124,246,0.04) 100%)', border: '1px solid rgba(139,124,246,0.15)', borderRadius: '18px', padding: '24px 20px', boxShadow: '0 2px 12px rgba(139,124,246,0.07)' }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
                  نشاط المحادثات الأسبوعي
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>عدد المحادثات</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4E9F8A" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#4E9F8A" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Cairo' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<LineTooltip />} />
                  <Area
                    type="monotone" dataKey="value"
                    stroke="#4E9F8A" strokeWidth={2.5}
                    fill="url(#areaFill)"
                    dot={{ fill: '#2F6F5F', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2F6F5F', stroke: '#CFE7DF', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Most Searched Topics — Bar Chart */}
            <div style={{ background: 'linear-gradient(145deg, rgba(139,124,246,0.06) 0%, rgba(47,111,95,0.04) 100%)', border: '1px solid rgba(139,124,246,0.15)', borderRadius: '18px', padding: '24px 20px', boxShadow: '0 2px 12px rgba(139,124,246,0.07)' }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
                  أكثر المواضيع القانونية بحثاً
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>عدد مرات البحث</div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={topicData}
                  layout="vertical"
                  margin={{ top: 4, right: 50, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" horizontal={false} />
                  <XAxis
                    type="number" domain={[0, 25]} ticks={[0, 5, 10, 15, 20, 25]}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    type="category" dataKey="name" width={200}
                    tick={{ fontSize: 12, fill: '#1F2937', fontFamily: 'Cairo' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={16}>
                    {topicData.map((_, i) => (
                      <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{
                        fontSize: 11, fontWeight: 700,
                        fill: '#2F6F5F', fontFamily: 'Cairo',
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Performance Indicators ── */}
          <div style={{ background: 'linear-gradient(145deg, rgba(47,111,95,0.05) 0%, rgba(139,124,246,0.06) 100%)', border: '1px solid rgba(139,124,246,0.15)', borderRadius: '18px', padding: '26px 28px', marginTop: 20, boxShadow: '0 2px 12px rgba(139,124,246,0.07)' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: '#CFE7DF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <IconGauge />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                  مؤشرات أداء المساعد الذكي
                </div>
                <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>
                  قياس أداء النظام وجودة الإجابات وكفاءة استرجاع المعلومات من الملفات القانونية.
                </div>
              </div>
            </div>

            {/* 2×2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {performance.map((item, i) => (
                <PerformanceCard key={i} {...item} />
              ))}
            </div>
          </div>

          <div style={{ height: 36 }} />
        </div>
      </main>
    </div>
  )
}

/* ── Performance Card component ──────────────────────── */
function PerformanceCard({ iconEl, iconBg, cardBg, barGrad, value, unit, label, desc, note, progress, accent }) {
  return (
    <div style={{
      padding: '20px 22px',
      background: cardBg || '#F8FAF9',
      borderRadius: 16,
      border: '1px solid rgba(139,124,246,0.15)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 2px 12px rgba(139,124,246,0.07)',
    }}>
      {/* Top: icon + value */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {iconEl}
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#1F2937' }}>{value}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginRight: 4 }}>{unit}</span>
        </div>
      </div>

      {/* Label */}
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
        {label}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.75, marginBottom: 12, flex: 1 }}>
        {desc}
      </div>

      {/* Progress bar with gradient */}
      {progress !== null && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 5, background: 'rgba(139,124,246,0.15)', borderRadius: 50, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: barGrad || accent,
              borderRadius: 50,
            }} />
          </div>
        </div>
      )}

      {/* Note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: accent, marginTop: 5, flexShrink: 0,
        }} />
        <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.65 }}>{note}</div>
      </div>
    </div>
  )
}

/* ── Stat Card component ──────────────────────────────── */
function StatCard({ label, value, icon, badge, desc, cardBg, iconBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: cardBg || '#FFFFFF',
        border: '1px solid rgba(139,124,246,0.15)',
        borderRadius: '18px',
        padding: '22px 22px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered
          ? '0 8px 28px rgba(139,124,246,0.12)'
          : '0 2px 12px rgba(139,124,246,0.07)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'default',
      }}
    >
      {/* Top row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg || 'linear-gradient(135deg, #CFE7DF, #EDE9FE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: '#5AA58D',
          background: 'rgba(90,165,141,0.10)',
          padding: '3px 9px', borderRadius: 20,
          alignSelf: 'flex-start',
        }}>
          ↗ {badge}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 34, fontWeight: 700,
        color: '#1F2937', lineHeight: 1.1,
        marginBottom: 4,
      }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 3 }}>
        {label}
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: '#6B7280' }}>
        {desc}
      </div>
    </div>
  )
}
