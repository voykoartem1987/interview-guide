import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore, { STATUS_META, SCORE_META } from '../store/useStore'
import { QUESTIONS, LEVEL_LABELS, SECTIONS } from '../data/questions'

const GRADE_COLOR = { junior: 'bg-emerald-100 text-emerald-800', middle: 'bg-amber-100 text-amber-800', senior: 'bg-purple-100 text-purple-800' }

function calcScore(interview) {
  const vals = Object.values(interview.answers).filter(a => a.score !== null)
  if (!vals.length) return null
  return Math.round((vals.reduce((s, a) => s + a.score, 0) / (vals.length * 2)) * 100)
}

function ScoreBar({ pct }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function CandidateProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getCandidate, getCandidateInterviews, updateCandidate, deleteCandidate, startInterview, templates, saveTemplate, deleteTemplate } = useStore()
  const candidate = getCandidate(id)
  const interviewList = getCandidateInterviews(id)
  const [showSetup, setShowSetup] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [setup, setSetup] = useState({ sections: ['meta', 'google', 'analytics'], grade: candidate?.targetGrade || 'middle', count: 0 })
  const [templateName, setTemplateName] = useState('')

  if (!candidate) return <div className="p-8 text-slate-400">Кандидат не найден. <Link to="/" className="underline">На главную</Link></div>

  const handleDelete = () => {
    if (confirm(`Удалить кандидата ${candidate.name}?`)) { deleteCandidate(id); navigate('/') }
  }

  const toggleSection = (sec) => {
    setSetup(s => ({
      ...s,
      sections: s.sections.includes(sec) ? s.sections.filter(x => x !== sec) : [...s.sections, sec]
    }))
  }

  const handleStart = () => {
    if (!setup.sections.length) return
    const allQs = setup.sections.flatMap(sec => {
      const level = QUESTIONS[sec]?.levels[setup.grade]
      if (!level) return []
      return level.themes.flatMap(t => t.questions.map(q => q.id))
    })
    const questionIds = setup.count > 0
      ? allQs.sort(() => Math.random() - 0.5).slice(0, setup.count)
      : allQs
    const iid = startInterview(id, { sections: setup.sections, grade: setup.grade, questionIds })
    navigate(`/interview/${iid}`)
  }

  const sectionScore = (interview, secKey) => {
    const level = QUESTIONS[secKey]?.levels[interview.grade]
    if (!level) return null
    const ids = new Set(level.themes.flatMap(t => t.questions.map(q => q.id)))
    const vals = Object.entries(interview.answers).filter(([qid, a]) => ids.has(qid) && a.score !== null).map(([, a]) => a.score)
    if (!vals.length) return null
    return Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length * 2)) * 100)
  }

  const totalQ = (interview) => {
    const answered = Object.values(interview.answers).filter(a => a.score !== null).length
    return { answered, total: interview.questionIds.length }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="text-slate-400 text-sm hover:text-slate-600 mb-4 inline-block">← Назад</Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold text-2xl flex items-center justify-center flex-shrink-0">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{candidate.name}</h1>
              <p className="text-slate-500 text-sm">{candidate.position}</p>
              <div className="flex gap-2 mt-1.5">
                <span className={`badge ${GRADE_COLOR[candidate.targetGrade]}`}>{LEVEL_LABELS[candidate.targetGrade]}</span>
                {editStatus ? (
                  <select className="input !py-0.5 !px-2 text-xs w-auto" value={candidate.status} onChange={e => { updateCandidate(id, { status: e.target.value }); setEditStatus(false) }}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setEditStatus(true)} className={`badge cursor-pointer hover:opacity-80 ${STATUS_META[candidate.status].color}`}>{STATUS_META[candidate.status].label} ✎</button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setShowSetup(true)}>+ Интервью</button>
            <button className="btn-danger" onClick={handleDelete}>Удалить</button>
          </div>
        </div>

        {candidate.notes && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{candidate.notes}</div>
        )}
      </div>

      {showSetup && (
        <div className="card p-5 mb-6 border-indigo-200 border-2">
          <h3 className="font-semibold mb-4">Настройка интервью</h3>
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <label className="label">Шаблоны</label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center gap-1 bg-slate-100 hover:bg-indigo-50 rounded-lg pl-2.5 pr-1 py-1.5 transition-colors">
                      <button type="button" onClick={() => setSetup({ sections: t.sections, grade: t.grade, count: t.count })}
                        className="text-xs text-slate-700 hover:text-indigo-700 font-medium">{t.name}</button>
                      <button type="button" onClick={() => deleteTemplate(t.id)}
                        className="text-slate-400 hover:text-red-500 text-sm leading-none ml-1 px-0.5">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Грейд</label>
              <div className="flex gap-2">
                {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setSetup(s => ({ ...s, grade: k }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${setup.grade === k ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Разделы</label>
              <div className="flex gap-2">
                {SECTIONS.map(sec => (
                  <button key={sec.key} type="button" onClick={() => toggleSection(sec.key)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${setup.sections.includes(sec.key) ? 'text-white' : 'border-slate-200 text-slate-600'}`}
                    style={setup.sections.includes(sec.key) ? { background: sec.color, borderColor: sec.color } : {}}>
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Количество вопросов (0 = все)</label>
              <input type="number" min={0} className="input" value={setup.count} onChange={e => setSetup(s => ({ ...s, count: parseInt(e.target.value) || 0 }))} placeholder="0 — все вопросы" />
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Название шаблона..."
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
              <button
                type="button"
                disabled={!templateName.trim()}
                onClick={() => { saveTemplate(templateName.trim(), setup); setTemplateName('') }}
                className="btn-ghost text-sm whitespace-nowrap disabled:opacity-40"
              >Сохранить шаблон</button>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowSetup(false)}>Отмена</button>
              <button className="btn-primary flex-1" onClick={handleStart} disabled={!setup.sections.length}>Начать интервью</button>
            </div>
          </div>
        </div>
      )}

      <h2 className="font-semibold text-slate-900 mb-3">История интервью</h2>
      {interviewList.length === 0 && (
        <div className="card p-8 text-center text-slate-400">Интервью ещё не проводились</div>
      )}
      <div className="space-y-3">
        {interviewList.map(interview => {
          const score = calcScore(interview)
          const { answered, total } = totalQ(interview)
          const rec = interview.recommendation
          return (
            <div key={interview.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{new Date(interview.startedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className={`badge ${GRADE_COLOR[interview.grade]}`}>{LEVEL_LABELS[interview.grade]}</span>
                    {!interview.completedAt && <span className="badge bg-yellow-100 text-yellow-800">В процессе</span>}
                    {rec === 'hire'   && <span className="badge bg-green-100 text-green-800">Нанять</span>}
                    {rec === 'maybe'  && <span className="badge bg-blue-100 text-blue-800">Подумать</span>}
                    {rec === 'reject' && <span className="badge bg-red-100 text-red-800">Отказ</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{interview.sections.map(s => QUESTIONS[s]?.label).join(', ')} · {answered}/{total} вопросов</div>
                </div>
                <div className="flex items-center gap-3">
                  {score !== null && <span className={`text-2xl font-bold ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}%</span>}
                  <Link to={interview.completedAt ? `/interview/${interview.id}/result` : `/interview/${interview.id}`}
                    className="btn-primary text-xs">
                    {interview.completedAt ? 'Результат' : 'Продолжить'}
                  </Link>
                </div>
              </div>
              {score !== null && (
                <div className="mt-3 grid gap-2">
                  {interview.sections.map(sec => {
                    const s = sectionScore(interview, sec)
                    if (s === null) return null
                    return (
                      <div key={sec} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24 flex-shrink-0">{QUESTIONS[sec]?.label}</span>
                        <ScoreBar pct={s} />
                        <span className="text-xs font-medium w-10 text-right">{s}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
