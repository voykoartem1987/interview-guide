import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useStore, { STATUS_META } from '../store/useStore'
import { LEVEL_LABELS } from '../data/questions'
import NewCandidateModal from './NewCandidateModal'

const GRADE_COLOR = { junior: 'bg-emerald-100 text-emerald-800', middle: 'bg-amber-100 text-amber-800', senior: 'bg-purple-100 text-purple-800' }

function scoreColor(pct) {
  if (pct === null) return 'text-slate-400'
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function calcScore(interview) {
  if (!interview.completedAt) return null
  const vals = Object.values(interview.answers).filter(a => a.score !== null)
  if (!vals.length) return null
  return Math.round((vals.reduce((s, a) => s + a.score, 0) / (vals.length * 2)) * 100)
}

export default function Dashboard() {
  const { candidates, interviews, deleteCandidate } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const filtered = filter === 'all' ? candidates : candidates.filter(c => c.status === filter)

  const completedInterviews = interviews.filter(i => i.completedAt)
  const scores = completedInterviews.map(i => {
    const vals = Object.values(i.answers).filter(a => a.score !== null)
    return vals.length ? Math.round((vals.reduce((s, a) => s + a.score, 0) / (vals.length * 2)) * 100) : null
  }).filter(s => s !== null)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const hired = candidates.filter(c => c.status === 'passed').length

  const lastInterview = (candidateId) => {
    const ci = interviews.filter(i => i.candidateId === candidateId && i.completedAt).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    return ci[0] || null
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Кандидаты</h1>
          <p className="text-slate-500 text-sm mt-0.5">{candidates.length} кандидатов в базе</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          + Добавить кандидата
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{candidates.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Кандидатов</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{hired}</div>
            <div className="text-xs text-slate-500 mt-0.5">Принято</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{completedInterviews.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Интервью</div>
          </div>
          <div className="card p-4 text-center">
            <div className={`text-2xl font-bold ${avgScore !== null ? (avgScore >= 75 ? 'text-green-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-500') : 'text-slate-400'}`}>
              {avgScore !== null ? `${avgScore}%` : '-'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Средний скор</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[['all', 'Все'], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-slate-500">Нет кандидатов. Добавьте первого!</p>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(c => {
          const last = lastInterview(c.id)
          const score = last ? calcScore(last) : null
          const interviewCount = interviews.filter(i => i.candidateId === c.id && i.completedAt).length
          return (
            <div key={c.id} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/candidates/${c.id}`)}>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <span className={`badge ${GRADE_COLOR[c.targetGrade] || 'bg-slate-100 text-slate-600'}`}>{LEVEL_LABELS[c.targetGrade]}</span>
                  <span className={`badge ${STATUS_META[c.status].color}`}>{STATUS_META[c.status].label}</span>
                </div>
                <div className="text-slate-400 text-xs mt-0.5">{c.position || 'Таргетолог'} · {new Date(c.createdAt).toLocaleDateString('ru')}</div>
              </div>
              <div className="text-right flex-shrink-0">
                {score !== null ? (
                  <>
                    <div className={`text-2xl font-bold ${scoreColor(score)}`}>{score}%</div>
                    <div className="text-xs text-slate-400">{interviewCount} {interviewCount === 1 ? 'интервью' : 'интервью'}</div>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm">Не проводилось</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showNew && <NewCandidateModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
