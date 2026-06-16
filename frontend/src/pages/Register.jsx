import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form.username, form.email, form.password)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">📘</div>
        <h1>PDPL Assistant</h1>
        <p className="auth-subtitle">إنشاء حساب جديد</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={form.username}
              onChange={set('username')}
              placeholder="اختر اسم المستخدم"
              required
            />
          </div>
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="أدخل بريدك الإلكتروني"
              required
            />
          </div>
          <div className="field">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="اختر كلمة مرور"
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="auth-link">
          عندك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  )
}
