import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useHeadTracking } from '../hooks/useHeadTracking'

/* ─────────────────────────────────────────────────────────────
   MASTER QUESTION BANK  (5 scenarios, no emojis)
───────────────────────────────────────────────────────────── */
const QUESTION_BANK = [
  {
    id: 1,
    scenario: 'أثناء التسجيل في منصة رقمية، طُلب منك رفع صورة الهوية الوطنية ورقم الجوال والبريد الإلكتروني للحصول على نشرة إخبارية فقط.',
    options: {
      A: { text: 'أرفع جميع البيانات المطلوبة',              safe: false },
      B: { text: 'أتحقق من الحاجة الفعلية لكل البيانات',    safe: true  },
    },
    correctKey: 'B',
    explanation: 'يجب أن تكون البيانات المطلوبة متناسبة مع الغرض من الخدمة.',
  },
  {
    id: 2,
    scenario: 'تلقيت رسالة بريد إلكتروني تطلب تحديث بياناتك الشخصية عبر رابط خارجي بشكل عاجل.',
    options: {
      A: { text: 'أدخل بياناتي مباشرة',                         safe: false },
      B: { text: 'أتحقق من الجهة عبر القنوات الرسمية',         safe: true  },
    },
    correctKey: 'B',
    explanation: 'يجب التأكد من هوية الجهة قبل مشاركة أي بيانات شخصية.',
  },
  {
    id: 3,
    scenario: 'اكتشفت أن إحدى الجهات ما زالت تحتفظ ببياناتك الشخصية رغم انتهاء علاقتك بها منذ فترة طويلة.',
    options: {
      A: { text: 'أتجاهل الأمر',                                              safe: false },
      B: { text: 'أستفسر عن سبب استمرار الاحتفاظ بالبيانات', safe: true  },
    },
    correctKey: 'B',
    explanation: 'يجب أن يكون الاحتفاظ بالبيانات مرتبطاً بغرض مشروع ومحدد.',
  },
  {
    id: 4,
    scenario: 'شركة ترغب في استخدام بياناتك لإرسال عروض تسويقية لم يتم توضيحها عند جمع البيانات.',
    options: {
      A: { text: 'هذا استخدام طبيعي للبيانات',                              safe: false },
      B: { text: 'يجب أن يكون الاستخدام متوافقاً مع الغرض الأصلي', safe: true  },
    },
    correctKey: 'B',
    explanation: 'لا ينبغي استخدام البيانات في أغراض مختلفة دون أساس مشروع.',
  },
  {
    id: 5,
    scenario: 'تطبيق يطلب الوصول الدائم إلى موقعك الجغرافي رغم أن الخدمة لا تحتاج ذلك بشكل أساسي.',
    options: {
      A: { text: 'أمنح التطبيق جميع الصلاحيات',           safe: false },
      B: { text: 'أمنح الحد الأدنى من الصلاحيات اللازمة', safe: true  },
    },
    correctKey: 'B',
    explanation: 'تقليل مشاركة البيانات والصلاحيات يعزز حماية الخصوصية.',
  },
]

const PRIVACY_TIPS = [
  'راجع أذونات التطبيقات بشكل دوري.',
  'لا تشارك رموز التحقق مع أي شخص.',
  'استخدم كلمات مرور مختلفة لكل حساب.',
  'فعّل التحقق الثنائي للحسابات المهمة.',
  'لا تقدم بيانات شخصية أكثر من المطلوب.',
  'اقرأ سياسة الخصوصية قبل الموافقة عليها.',
  'تحقق من الجهة التي تطلب بياناتك.',
  'استخدم شبكات آمنة عند تنفيذ العمليات الحساسة.',
]

/* ─── Shuffle + randomise left/right sides ─────────────────── */
function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildSession() {
  return fisherYates(QUESTION_BANK).map(q => {
    const swapped = Math.random() < 0.5
    return {
      id: q.id,
      scenario:    q.scenario,
      explanation: q.explanation,
      left:  swapped ? q.options.B : q.options.A,
      right: swapped ? q.options.A : q.options.B,
      correctSide: swapped
        ? (q.correctKey === 'B' ? 'left' : 'right')
        : (q.correctKey === 'B' ? 'right' : 'left'),
    }
  })
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const DWELL_MS   = 1000
const YAW_ON     = 15
const YAW_OFF    = 10
const MAX_SCORE  = 50

/* ─────────────────────────────────────────────────────────────
   SVG ICONS  (no emojis)
───────────────────────────────────────────────────────────── */
function ShieldIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
    </svg>
  )
}
function LogoIcon() {
  return (
    <svg width="48" height="53" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lgg" x1="20" y1="0" x2="180" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B3578"/>
          <stop offset="100%" stopColor="#3ECF8E"/>
        </linearGradient>
      </defs>
      <path d="M100 8 L182 42 V112 C182 158 148 194 100 213 C52 194 18 158 18 112 V42 Z" stroke="url(#lgg)" strokeWidth="3" fill="none"/>
      <path d="M100 22 L168 52 V110 C168 149 138 181 100 197 C62 181 32 149 32 110 V52 Z" stroke="url(#lgg)" strokeWidth="1.8" fill="none"/>
      <path d="M85 88 V72 C85 61 115 61 115 72 V88" stroke="url(#lgg)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="74" y="87" width="52" height="38" rx="6" stroke="url(#lgg)" strokeWidth="2.5" fill="none"/>
      <circle cx="100" cy="104" r="5" stroke="url(#lgg)" strokeWidth="2" fill="none"/>
      <line x1="100" y1="109" x2="100" y2="117" stroke="url(#lgg)" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="100" cy="142" rx="22" ry="7" stroke="url(#lgg)" strokeWidth="2" fill="none"/>
      <line x1="78" y1="142" x2="78" y2="162" stroke="url(#lgg)" strokeWidth="2"/>
      <line x1="122" y1="142" x2="122" y2="162" stroke="url(#lgg)" strokeWidth="2"/>
      <path d="M78 152 Q100 158 122 152" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <ellipse cx="100" cy="162" rx="22" ry="7" stroke="url(#lgg)" strokeWidth="2" fill="none"/>
      <line x1="74" y1="96" x2="56" y2="96" stroke="url(#lgg)" strokeWidth="1.5"/>
      <line x1="56" y1="96" x2="56" y2="114" stroke="url(#lgg)" strokeWidth="1.5"/>
      <circle cx="56" cy="114" r="3.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="56" y1="104" x2="44" y2="104" stroke="url(#lgg)" strokeWidth="1.5"/>
      <rect x="36" y="100" width="8" height="8" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <circle cx="67" cy="96" r="2.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <rect x="38" y="82" width="7" height="7" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="45" y1="85" x2="55" y2="85" stroke="url(#lgg)" strokeWidth="1.5"/>
      <line x1="41" y1="82" x2="41" y2="75" stroke="url(#lgg)" strokeWidth="1.5"/>
      <circle cx="41" cy="72" r="2.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="126" y1="96" x2="144" y2="96" stroke="url(#lgg)" strokeWidth="1.5"/>
      <line x1="144" y1="96" x2="144" y2="114" stroke="url(#lgg)" strokeWidth="1.5"/>
      <circle cx="144" cy="114" r="3.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="144" y1="104" x2="156" y2="104" stroke="url(#lgg)" strokeWidth="1.5"/>
      <rect x="156" y="100" width="8" height="8" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <circle cx="133" cy="96" r="2.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <rect x="155" y="82" width="7" height="7" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="148" y1="85" x2="155" y2="85" stroke="url(#lgg)" strokeWidth="1.5"/>
      <line x1="159" y1="82" x2="159" y2="75" stroke="url(#lgg)" strokeWidth="1.5"/>
      <circle cx="159" cy="72" r="2.5" stroke="url(#lgg)" strokeWidth="1.5" fill="none"/>
      <line x1="100" y1="178" x2="100" y2="203" stroke="url(#lgg)" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M100 178 C100 172 100 166 100 162" stroke="url(#lgg)" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
      <path d="M100 179 C97 172 91 167 85 165" stroke="url(#lgg)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M100 179 C103 172 109 167 115 165" stroke="url(#lgg)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M100 180 C94 175 86 173 79 174" stroke="url(#lgg)" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      <path d="M100 180 C106 175 114 173 121 174" stroke="url(#lgg)" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      <path d="M100 181 C91 180 83 182 77 186" stroke="url(#lgg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M100 181 C109 180 117 182 123 186" stroke="url(#lgg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M100 182 C90 184 82 188 77 193" stroke="url(#lgg)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M100 182 C110 184 118 188 123 193" stroke="url(#lgg)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <line x1="74" y1="214" x2="122" y2="196" stroke="url(#lgg)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="70" y1="210" x2="78" y2="218" stroke="url(#lgg)" strokeWidth="1.9" strokeLinecap="round"/>
      <line x1="126" y1="214" x2="78" y2="196" stroke="url(#lgg)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="130" y1="210" x2="122" y2="218" stroke="url(#lgg)" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#1B8354" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#E53E3E" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}
function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   CONFETTI  (pure canvas, no library)
───────────────────────────────────────────────────────────── */
function Confetti() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#1B8354','#46A978','#CDB4F6','#F59E0B','#EF4444','#3B82F6','#F472B6','#FBBF24']
    const pieces = Array.from({ length: 160 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height - canvas.height,
      r:    Math.random() * 7 + 3,
      d:    Math.random() * 3 + 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * 10 - 5,
      tiltSpeed: Math.random() * 0.1 + 0.05,
      angle: 0,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        p.y      += p.d
        p.angle  += p.tiltSpeed
        p.tilt    = Math.sin(p.angle) * 12
        if (p.y > canvas.height) {
          p.y = -10; p.x = Math.random() * canvas.width
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    const stop = setTimeout(() => cancelAnimationFrame(raf), 5000)
    return () => { cancelAnimationFrame(raf); clearTimeout(stop) }
  }, [])
  return (
    <canvas ref={canvasRef}
      style={{ position:'fixed', inset:0, zIndex:200, pointerEvents:'none' }} />
  )
}

/* ─────────────────────────────────────────────────────────────
   DWELL RING
───────────────────────────────────────────────────────────── */
function DwellRing({ progress, direction }) {
  const r    = 136
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - progress)
  const clr  = direction === 'left' ? '#1B8354' : '#CDB4F6'
  return (
    <svg className="g-dwell-svg" viewBox="0 0 300 300">
      <circle cx="150" cy="150" r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle cx="150" cy="150" r={r} fill="none"
        stroke={clr} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transform:'rotate(-90deg)', transformOrigin:'150px 150px',
                 transition:'stroke-dashoffset 0.04s linear, stroke 0.25s',
                 filter:`drop-shadow(0 0 8px ${clr}88)` }} />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   FACE STATUS
───────────────────────────────────────────────────────────── */
function FaceStatus({ status }) {
  const map = {
    loading: { dot: '#F59E0B', text: 'جارٍ تحميل النموذج' },
    ready:   { dot: '#1B8354', text: 'تتبع الوجه نشط'     },
    noface:  { dot: '#E53E3E', text: 'لم يُكتشف وجه'       },
    error:   { dot: '#9CA3AF', text: 'الكاميرا غير متاحة'  },
  }
  const s = map[status] || map.loading
  return (
    <div className="g-face-status">
      <span className="g-face-dot" style={{ background: s.dot }} />
      <span>{s.text}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RESULT SCREEN
───────────────────────────────────────────────────────────── */
function ResultScreen({ score, onReplay, onHome }) {
  const tip = useMemo(() => PRIVACY_TIPS[Math.floor(Math.random() * PRIVACY_TIPS.length)], [])

  let tier
  if (score >= 40)      tier = { title: 'ممتاز',             msg: 'لديك مستوى وعي مرتفع في حماية البيانات الشخصية.',                        accent: '#1B8354', bg: 'rgba(234,248,241,0.85)' }
  else if (score >= 25) tier = { title: 'جيد',               msg: 'لديك معرفة جيدة، ويمكنك تطوير وعيك أكثر في بعض المواقف.',               accent: '#D97706', bg: 'rgba(255,251,235,0.85)' }
  else                  tier = { title: 'بحاجة إلى تحسين',  msg: null, tip, accent: '#E53E3E', bg: 'rgba(254,242,242,0.85)' }

  const perfect = score >= MAX_SCORE

  return (
    <div className="g-result-overlay">
      {perfect && <Confetti />}
      <motion.div className="g-result-card"
        style={{ background: tier.bg }}
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        transition={{ duration: 0.45, ease: [0.34,1.26,0.64,1] }}>

        {/* Shield icon */}
        <div className="g-result-icon" style={{ color: tier.accent }}>
          <ShieldIcon size={44} color={tier.accent} />
        </div>

        {/* Score ring */}
        <div className="g-result-score-wrap">
          <svg viewBox="0 0 120 120" className="g-score-ring">
            <circle cx="60" cy="60" r="52" fill="none"
              stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
            <motion.circle cx="60" cy="60" r="52" fill="none"
              stroke={tier.accent} strokeWidth="8"
              strokeDasharray={2 * Math.PI * 52}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - Math.max(0,score) / MAX_SCORE) }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
              strokeLinecap="round"
              style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px' }} />
          </svg>
          <div className="g-score-center">
            <motion.div className="g-score-num" style={{ color: tier.accent }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>
              {score}
            </motion.div>
            <div className="g-score-max">من {MAX_SCORE}</div>
          </div>
        </div>

        {/* Title */}
        <div className="g-result-title" style={{ color: tier.accent }}>{tier.title}</div>
        <div className="g-result-msg">
          {tier.msg || (
            <>
              <p style={{ marginBottom: 14 }}>استمر في التعلم لتعزيز وعيك بحماية بياناتك.</p>
              <div className="g-tip-box">
                <div className="g-tip-label">نصيحة اليوم</div>
                <div className="g-tip-text">{tier.tip}</div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="g-result-actions">
          <motion.button className="g-btn-primary" onClick={onReplay}
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}>
            إعادة اللعبة
          </motion.button>
          <motion.button className="g-btn-ghost" onClick={onHome}
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}>
            المساعد الذكي
          </motion.button>
        </div>

      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CHOICE CARD  — fullscreen side card style
───────────────────────────────────────────────────────────── */
function ChoiceCard({ side, option, active, dwellPct, onClick }) {
  const isLeft = side === 'left'
  const activeColor = isLeft ? 'rgba(27,131,84,0.95)' : 'rgba(155,142,240,0.95)'
  const activeShadow = isLeft ? 'rgba(27,131,84,0.55)' : 'rgba(155,142,240,0.55)'
  return (
    <motion.div
      onClick={onClick}
      animate={active ? { scale: 1.07 } : { scale: 1 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        background: active ? activeColor : 'rgba(255,255,255,0.55)',
        borderRadius: 22,
        padding: '22px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        boxShadow: active
          ? `0 10px 36px ${activeShadow}`
          : '0 4px 18px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1.5px solid ${active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)'}`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
      }}>

      <div style={{
        fontSize: 14, fontWeight: 700,
        color: active ? '#fff' : '#1a1a1a',
        lineHeight: 1.6, direction: 'rtl',
      }}>
        {option.text}
      </div>

      {/* Dwell bar */}
      {active && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dwellPct * 100}%` }}
          transition={{ duration: 0.04 }}
          style={{
            position: 'absolute', bottom: 0, left: 0,
            height: 5, borderRadius: 3,
            background: 'rgba(255,255,255,0.75)',
          }}
        />
      )}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function GamePage() {
  const navigate  = useNavigate()
  const [session, setSession]   = useState(() => buildSession())
  const [current, setCurrent]   = useState(0)
  const [score,   setScore]     = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [choosing, setChoosing] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [direction, setDirection] = useState(null)
  const [dwellPct,  setDwellPct]  = useState(0)

  const dwellRef   = useRef(null)
  const dwellStart = useRef(null)

  const scenario = session[current]

  /* ── Head tracking ── */
  const handleYaw = useCallback((yaw) => {
    if (feedback || choosing) return
    if      (yaw >  YAW_ON)  setDirection('right')
    else if (yaw < -YAW_ON)  setDirection('left')
    else if (Math.abs(yaw) < YAW_OFF) setDirection(null)
  }, [feedback, choosing])

  const { videoRef, canvasRef, status: faceStatus } =
    useHeadTracking({ onYaw: handleYaw, enabled: true })

  /* ── Choose ── */
  const choose = useCallback((side) => {
    if (feedback || choosing) return
    clearInterval(dwellRef.current)
    setChoosing(true)
    setDirection(null)
    setDwellPct(0)

    const correct = side === scenario.correctSide
    setScore(p => p + (correct ? 10 : -5))
    setFeedback({ correct, explanation: scenario.explanation })

    setTimeout(() => {
      setFeedback(null)
      setChoosing(false)
      if (current + 1 >= session.length) setGameOver(true)
      else setCurrent(p => p + 1)
    }, 2500)
  }, [feedback, choosing, scenario, current, session.length])

  /* ── Dwell timer ── */
  useEffect(() => {
    clearInterval(dwellRef.current)
    setDwellPct(0)
    if (!direction || feedback || choosing) return

    dwellStart.current = performance.now()
    dwellRef.current = setInterval(() => {
      const p = Math.min((performance.now() - dwellStart.current) / DWELL_MS, 1)
      setDwellPct(p)
      if (p >= 1) { clearInterval(dwellRef.current); choose(direction) }
    }, 16)

    return () => clearInterval(dwellRef.current)
  }, [direction, feedback, choosing, choose])

  /* ── Replay ── */
  const handleReplay = () => {
    setSession(buildSession())
    setCurrent(0); setScore(0)
    setFeedback(null); setChoosing(false)
    setGameOver(false); setDirection(null); setDwellPct(0)
  }

  /* ── Game over ── */
  if (gameOver) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <ResultScreen score={score} onReplay={handleReplay} onHome={() => navigate('/')} />
    </div>
  )

  const progress = (current / session.length) * 100

  /* ══════════════════════════════════════════════════════════
     RENDER  — fullscreen camera layout
  ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', background:'#111' }}>

      {/* ── FULLSCREEN CAMERA ── */}
      <video ref={videoRef} autoPlay muted playsInline style={{ display:'none' }} />
      <canvas ref={canvasRef} style={{
        position:'absolute', inset:0,
        width:'100%', height:'100%',
        objectFit:'cover', display:'block',
      }} />

      {/* Subtle dark vignette for readability */}
      <div style={{
        position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, zIndex:10,
        padding:'14px 18px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <motion.button onClick={() => navigate('/')} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          style={{ background:'rgba(255,255,255,0.88)', border:'none', borderRadius:20,
            padding:'7px 16px', fontSize:13, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, fontFamily:'inherit',
            boxShadow:'0 2px 10px rgba(0,0,0,0.2)' }}>
          <ArrowLeft /> رجوع
        </motion.button>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,0.6)' }}>
            حارس هويتك
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>
            {current + 1} / {session.length}
          </div>
        </div>

        <motion.div key={score} initial={{ scale:1.4 }} animate={{ scale:1 }}
          transition={{ duration:0.3, ease:[0.34,1.26,0.64,1] }}
          style={{ background:'rgba(27,131,84,0.92)', borderRadius:20,
            padding:'7px 16px', color:'#fff', fontSize:14, fontWeight:700,
            boxShadow:'0 2px 10px rgba(27,131,84,0.5)' }}>
          {score} نقطة
        </motion.div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ position:'absolute', top:56, left:0, right:0, zIndex:10,
        height:3, background:'rgba(255,255,255,0.2)' }}>
        <motion.div animate={{ width:`${progress}%` }} transition={{ duration:0.45 }}
          style={{ height:'100%', background:'#1B8354', borderRadius:2 }} />
      </div>

      {/* ── QUESTION CARD (top center — above head) ── */}
      <div style={{
        position:'absolute', top:'9%', left:'50%',
        transform:'translateX(-50%)',
        zIndex:10, width:'min(56%, 430px)',
      }}>
        {/* Shield logo — no background */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:-10, position:'relative', zIndex:1 }}>
          <ShieldIcon size={32} color="#1B6B43" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={scenario.id}
            initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:14 }} transition={{ duration:0.26 }}
            style={{
              background:'rgba(255,255,255,0.52)',
              borderRadius:22, padding:'22px 20px',
              textAlign:'center',
              boxShadow:'0 8px 28px rgba(0,0,0,0.18)',
              backdropFilter:'blur(14px)',
              WebkitBackdropFilter:'blur(14px)',
              border:'1.5px solid rgba(255,255,255,0.45)',
            }}>
            <div style={{
              fontSize:13.5, fontWeight:600, color:'#1F2937',
              lineHeight:1.7, direction:'rtl',
            }}>
              {scenario.scenario}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── LEFT CHOICE ── */}
      <div style={{
        position:'absolute', left:'6%', top:'50%',
        transform:'translateY(-50%)',
        zIndex:10, width:'min(26%, 210px)',
      }}>
        <ChoiceCard side="left" option={scenario.left}
          active={direction === 'left'} dwellPct={dwellPct}
          onClick={() => choose('left')} />
      </div>

      {/* ── RIGHT CHOICE ── */}
      <div style={{
        position:'absolute', right:'6%', top:'50%',
        transform:'translateY(-50%)',
        zIndex:10, width:'min(26%, 210px)',
      }}>
        <ChoiceCard side="right" option={scenario.right}
          active={direction === 'right'} dwellPct={dwellPct}
          onClick={() => choose('right')} />
      </div>

      {/* ── DWELL RING (center, over face) ── */}
      {direction && dwellPct > 0 && (
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          zIndex:9, width:300, height:300, pointerEvents:'none',
        }}>
          <DwellRing progress={dwellPct} direction={direction} />
        </div>
      )}

      {/* ── HEAD DIRECTION BADGE ── */}
      <AnimatePresence>
        {direction && (
          <motion.div
            initial={{ opacity:0, scale:0.6 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.6 }}
            style={{
              position:'absolute', top:'50%', zIndex:11,
              ...(direction === 'left' ? { left:'26%' } : { right:'26%' }),
              transform:'translateY(-50%)',
              background: direction === 'left' ? '#1B8354' : '#9B8EF0',
              borderRadius:'50%', width:44, height:44,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', boxShadow:'0 4px 18px rgba(0,0,0,0.35)',
            }}>
            {direction === 'left' ? <ArrowLeft /> : <ArrowRight />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FACE STATUS + HINT ── */}
      <div style={{
        position:'absolute', bottom:20, left:'50%',
        transform:'translateX(-50%)', zIndex:10, textAlign:'center',
      }}>
        <FaceStatus status={faceStatus} />
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:5 }}>
          ثبّت رأسك يساراً أو يميناً لمدة ثانية، أو انقر مباشرة
        </div>
      </div>

      {/* ── FEEDBACK OVERLAY ── */}
      <AnimatePresence>
        {feedback && (
          <motion.div className="g-feedback-overlay"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className={`g-feedback-card ${feedback.correct ? 'fb-correct' : 'fb-wrong'}`}
              initial={{ scale:0.78, y:36 }}
              animate={{ scale:1, y:0 }}
              exit={{ scale:0.92, opacity:0 }}
              transition={{ duration:0.32, ease:[0.34,1.26,0.64,1] }}>
              <div className="g-fb-icon">
                {feedback.correct ? <CheckIcon /> : <XIcon />}
              </div>
              <div className={`g-fb-result ${feedback.correct ? 'fb-r-correct' : 'fb-r-wrong'}`}>
                {feedback.correct ? '+10 نقاط — إجابة صحيحة' : '-5 نقاط — إجابة خاطئة'}
              </div>
              <div className="g-fb-explain">{feedback.explanation}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
