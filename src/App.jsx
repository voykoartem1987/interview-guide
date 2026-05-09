import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CandidateProfile from './pages/CandidateProfile'
import Interview from './pages/Interview'
import InterviewResult from './pages/InterviewResult'
import KnowledgeBase from './pages/KnowledgeBase'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="candidates/:id" element={<CandidateProfile />} />
        <Route path="interview/:id" element={<Interview />} />
        <Route path="interview/:id/result" element={<InterviewResult />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
