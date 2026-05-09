import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useStore, { SCORE_META } from '../store/useStore'
import { QUESTIONS, LEVEL_LABELS } from '../data/questions'

function ScoreBar({ pct, color }) {
  const bg = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-3">
        <div className={`${bg} h-3 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-12 text-right text-sm font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
    </div>
  )
}

const REC_META = {
  hire:   { label: 'Рекомендуем нанять',  cls: 'bg-green-50 border-green-200 text-green-800', icon: '✓' },
  maybe:  { label: 'Нужно подумать',       cls: 'bg-blue-50 border-blue-200 text-blue-800',   icon: '~' },
  reject: { label: 'Не рекомендуем',       cls: 'bg-red-50 border-red-200 text-red-800',       icon: '✕' },
}

export default function InterviewResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getInterview, getCandidate } = useStore()
  const interview = getInterview(id)

  const data = useMemo(() => {
    if (!interview) return null
    const questionMap = {}
    interview.sections.forEach(sec => {
      const level = QUESTIONS[sec]?.levels[interview.grade]
      if (!level) return
      level.themes.forEach(t => t.questions.forEach(q => {
        questionMap[q.id] = { ...q, themeTitle: t.title, themeId: t.id, section: sec }
      }))
    })

    const answered = Object.entries(interview.answers).filter(([, a]) => a.score !== null)
    const total = answered.length
    const overall = total ? Math.round((answered.reduce((s, [, a]) => s + a.score, 0) / (total * 2)) * 100) : 0

    const bySection = {}
    interview.sections.forEach(sec => {
      const level = QUESTIONS[sec]?.levels[interview.grade]
      if (!level) return
      const ids = new Set(level.themes.flatMap(t => t.questions.map(q => q.id)))
      const vals = answered.filter(([qid]) => ids.has(qid))
      if (!vals.length) return
      const pct = Math.round((vals.reduce((s, [, a]) => s + a.score, 0) / (vals.length * 2)) * 100)
      bySection[sec] = { pct, count: vals.length }
    })

    const byTheme = {}
    answered.forEach(([qid, a]) => {
      const q = questionMap[qid]
      if (!q) return
      if (!byTheme[q.themeId]) byTheme[q.themeId] = { title: q.themeTitle, section: q.section, vals: [] }
      byTheme[q.themeId].vals.push(a.score)
    })
    Object.values(byTheme).forEach(t => {
      t.pct = Math.round((t.vals.reduce((s, v) => s + v, 0) / (t.vals.length * 2)) * 100)
    })

    const weakThemes = Object.values(byTheme).filter(t => t.pct < 50).sort((a, b) => a.pct - b.pct)
    const strongThemes = Object.values(byTheme).filter(t => t.pct >= 75).sort((a, b) => b.pct - a.pct)

    const flagged = answered
      .filter(([, a]) => a.score === 0 && a.note)
      .map(([qid, a]) => ({ ...questionMap[qid], note: a.note }))

    return { questionMap, overall, bySection, byTheme, weakThemes, strongThemes, flagged, total }
  }, [interview])

  if (!interview || !data) return <div className="p-8 text-slate-400">Не найдено. <Link to="/" className="underline">На главную</Link></div>
  const candidate = getCandidate(interview.candidateId)
  const rec = interview.recommendation ? REC_META[interview.recommendation] : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link to={`/candidates/${interview.candidateId}`} className="text-slate-400 hover:text-slate-600">←</Link>
        <h1 className="font-bold text-xl">Результат интервью</h1>
        <button className="btn-ghost ml-auto" onClick={() => window.print()}>🖨 Печать</button>
      </div>

      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{candidate?.name}</h2>
            <p className="text-sm text-slate-500">{candidate?.position} · {LEVEL_LABELS[interview.grade]} · {new Date(interview.completedAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${data.overall >= 75 ? 'text-green-600' : data.overall >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{data.overall}%</div>
            <div className="text-xs text-slate-400">{data.total} вопросов</div>
          </div>
        </div>
        {rec && (
          <div className={`mt-4 p-3 rounded-lg border ${rec.cls} font-semibold text-sm flex items-center gap-2`}>
            <span className="text-lg">{rec.icon}</span> {rec.label}
          </div>
        )}
        {interview.generalNote && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">"{interview.generalNote}"</div>
        )}
      </div>

      <div className="card p-5 mb-5">
        <h3 className="font-semibold mb-4">Результаты по разделам</h3>
        <div className="space-y-3">
          {interview.sections.map(sec => {
            const s = data.bySection[sec]
            if (!s) return null
            return (
              <div key={sec}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{QUESTIONS[sec]?.label}</span>
                  <span className="text-xs text-slate-400">{s.count} вопросов</span>
                </div>
                <ScoreBar pct={s.pct} />
              </div>
            )
          })}
        </div>
      </div>

      {data.weakThemes.length > 0 && (
        <div className="card p-5 mb-5 border-red-100">
          <h3 className="font-semibold mb-3 text-red-700">Слабые места</h3>
          <div className="space-y-2">
            {data.weakThemes.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{t.title}</span>
                <span className="text-sm font-bold text-red-500">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.strongThemes.length > 0 && (
        <div className="card p-5 mb-5 border-green-100">
          <h3 className="font-semibold mb-3 text-green-700">Сильные стороны</h3>
          <div className="space-y-2">
            {data.strongThemes.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{t.title}</span>
                <span className="text-sm font-bold text-green-600">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.flagged.length > 0 && (
        <div className="card p-5 mb-5 border-orange-100">
          <h3 className="font-semibold mb-3 text-orange-700">Красные флаги с заметками</h3>
          <div className="space-y-3">
            {data.flagged.map((q, i) => (
              <div key={i} className="border-l-4 border-red-300 pl-3">
                <p className="text-xs text-slate-500 mb-0.5">{q.themeTitle}</p>
                <p className="text-sm font-medium text-slate-800">{q.q}</p>
                <p className="text-xs text-red-600 mt-1 italic">Заметка: {q.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 mb-5">
        <h3 className="font-semibold mb-4">Все ответы</h3>
        <div className="space-y-2">
          {interview.questionIds.map(qid => {
            const q = data.questionMap[qid]
            const a = interview.answers[qid]
            if (!q || !a || a.score === null) return null
            const sm = SCORE_META[a.score]
            return (
              <div key={qid} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full ${a.score === 2 ? 'bg-green-500' : a.score === 1 ? 'bg-amber-400' : 'bg-red-400'} text-white text-xs flex items-center justify-center font-bold`}>{sm.short}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{q.q}</p>
                  {a.note && <p className="text-xs text-slate-400 mt-0.5 italic">{a.note}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 no-print">
        <Link to={`/candidates/${interview.candidateId}`} className="btn-ghost flex-1 text-center">← К кандидату</Link>
      </div>
    </div>
  )
}
