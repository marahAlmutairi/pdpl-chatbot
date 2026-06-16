import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const seen = localStorage.getItem('pdpl_game_seen')
    if (!seen) setVisible(true)
  }, [])

  const handleStart = () => {
    localStorage.setItem('pdpl_game_seen', '1')
    setVisible(false)
    navigate('/game')
  }

  const handleLater = () => {
    localStorage.setItem('pdpl_game_seen', '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="popup-card"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.35, ease: [0.34, 1.26, 0.64, 1] }}
          >
            {/* Glow ring */}
            <div className="popup-glow" />

            {/* Icon */}
            <motion.div
              className="popup-icon"
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
            >
              🎮
            </motion.div>

            <h2 className="popup-title">جرّب تجربة حارس هويتك التفاعلية</h2>

            <p className="popup-desc">
              اختبر قراراتك في حماية البيانات الشخصية عبر تجربة ذكية تعتمد على الواقع المعزز
            </p>

            {/* Features */}
            <div className="popup-features">
              {[
                { icon: '🎭', text: 'تجربة فلتر وجه تفاعلية (AR)' },
                { icon: '🧠', text: 'قرارات ذكية تحاكي الواقع الحقيقي' },
                { icon: '🛡️', text: 'تعلم حماية البيانات بطريقة ممتعة' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  className="popup-feature"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <span className="popup-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Buttons */}
            <div className="popup-actions">
              <motion.button
                className="popup-btn-primary"
                onClick={handleStart}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                ابدأ التجربة ✨
              </motion.button>
              <motion.button
                className="popup-btn-secondary"
                onClick={handleLater}
                whileHover={{ opacity: 0.8 }}
              >
                لاحقاً
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
