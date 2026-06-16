import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import HomePage     from './pages/HomePage'
import ChatPage      from './pages/ChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import GamePage      from './pages/GamePage'
import WelcomePopup  from './components/WelcomePopup'

export default function App() {
  return (
    <BrowserRouter>
      <WelcomePopup />
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/chat"      element={<ChatPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/game"      element={<GamePage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
