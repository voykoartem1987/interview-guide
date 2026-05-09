import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import useStore, { STATUS_META } from '../store/useStore'
import { QUESTIONS, LEVEL_LABELS } from '../data/questions'

const GRADE_COLOR = { junior: 'bg-emerald-100 text-emerald-800', middle: 'bg-amber-100 text-amber-800', senior: 'bg-purple-100 text-purple-800' }
const REC_LABEL = {
  hire:   { l: 'Нанять',   c: 'bg-green-100 text-green-800' },
  maybe:  { l: 'Подумать', c: 'bg-blue-100 text-blue-800'   },
  reject: { l: 'Отказ',    c: 'bg-red-100 text-red-800'     },
}

function scoreColor(pct) {
  if (pct === null || pct === undefined) return 'text-slate-300'
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function calcData(candidateId, interviews) {
  if (!candidateId) return null
  const ci = interviews
    .filter(i => i.candidateId === candidateId && i.completedAt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const last = ci[0] || null
  if (!last) return { last: null, score: null, bySection: {}, count: ci.length }
  const vals = Object.values(last.answers).filter(a => a.score !== null)
  const score = vals.length
    ? Math.round((vals.reduce((s, a) => s + a.score, 0) / (vals.length * 2)) * 100)
    : null
  const bySection = {}
  last.sections.forEach(sec => {
    const level = QUESTIONS[sec]?.levels[last.grade]
    if (!level) return
    const ids = new Set(level.themes.flatMap(t => t.questions.map(q => q.id)))
    const sv = Object.entries(last.answers)
      .filter(([qid, a]) => ids.has(qid) && a.score !== null)
      .map(([, a]) => a.score)
    if (sv.length) bySection[sec] = Math.round((sv.reduce((s, v) => s + v, 0) / (sv.length * 2)) * 100)
  })
  return { last, score, bySection, count: ci.length }
}

function CandidateCard({ candidate, data }) {
  if (!candidate) {
    return (
      <div className="card p-10 text-center text-slate-400 flex-1 flex items-center justify-center">
        <p className="text-sm">Выберите кандидата</p>
      </div>
    )
  }
  return (
    <div className="card p-5 flex-1">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center flex-shrink-0">
          {candidate.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <Link to={`/candidates/${candidate.id}`} className="font-bold text-slate-900 hover:text-indigo-600 block truncate">
            {candidate.name}
          </Link>
          <p className="text-xs text-slate-500 truncate">{candidate.position}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className={`badge ${GRADE_COLOR[candidate.targetGrade]}`}>{LEVEL_LABELS[candidate.targetGrade]}</span>
            <span className={`badge ${STATUS_META[candidate.status].color}`}>{STATUS_META[candidate.status].label}</span>
          </div>
        </div>
      </div>

      {!data?.last ? (
        <div className="text-slate-400 text-sm text-center py-6">Интервью не проводилось</div>
      ) : (
        <>
          <div className="text-center mb-5 py-4 bg-slate-50 rounded-xl">
            <div className={`text-5xl font-bold ${scoreColor(data.score)}`}>
              {data.score !== null ? `${data.score}%` : '-'}
            </div>
            <div className="text-xs text-slate-400 mt-1.5">
              {new Date(data.last.completedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
              {' · '}{LEVEL_LABELS[data.last.grade]}
            </div>
            {data.last.recommendation && (
              <span className={`mt-2 inline-block badge ${REC_LABEL[data.last.recommendation]?.c}`}>
                {REC_LABEL[data.last.recommendation]?.l}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {data.last.sections.map(sec => {
              const pct = data.bySection[sec]
              if (pct === undefined) return null
              const bar = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
              return (
                <div key={sec}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 font-medium">{QUESTIONS[sec]?.label}</span>
                    <span className={`text-xs font-bold ${scoreColor(pct)}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function Compare() {
  const { candidates, interviews } = useStore()
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')

  const candA = candidates.find(c => c.id === idA) || null
  const candB = candidates.find(c => c.id === idB) || null
  const dataA = useMemo(() => calcData(idA, interviews), [idA, interviews])
  const dataB = useMemo(() => calcData(idB, interviews), [idB, interviews])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">← Кандидаты</Link>
        <h1 className="text-2xl font-bold text-slate-900">Сравнение кандидатов</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="label">Кандидат A</label>
          <select className="input" value={idA} onChange={e => setIdA(e.target.value)}>
            <option value="">Выбрать...</option>
            {candidates.filter(c => c.id !== idB).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Кандидат B</label>
          <select className="input" value={idB} onChange={e => setIdB(e.target.value)}>
            <option value="">Выбрать...</option>
            {candidates.filter(c => c.id !== idA).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 items-stretch">
        <CandidateCard candidate={candA} data={dataA} />
        <div className="flex items-center justify-center font-bold text-slate-300 text-xl flex-shrink-0 w-8">vs</div>
        <CandidateCard candidate={candB} data={dataB} />
      </div>
    </div>
  )
}
