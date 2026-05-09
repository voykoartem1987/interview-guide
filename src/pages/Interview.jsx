import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useStore, { SCORE_META } from '../store/useStore'
import { QUESTIONS, LEVEL_LABELS } from '../data/questions'

const SCORE_BTNS = [
  { score: 2, label: 'Знает отлично', icon: '✓', cls: 'border-green-300 hover:bg-green-50', activeCls: 'bg-green-500 border-green-500 text-white' },
  { score: 1, label: 'Частично',      icon: '~', cls: 'border-amber-300 hover:bg-amber-50', activeCls: 'bg-amber-400 border-amber-400 text-white' },
  { score: 0, label: 'Не знает',      icon: '✕', cls: 'border-red-300 hover:bg-red-50',    activeCls: 'bg-red-400 border-red-400 text-white' },
]

export default function Interview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getInterview, getCandidate, setAnswer, setNote, setGeneralNote, completeInterview, toggleFlag, customQuestions } = useStore()
  const interview = getInterview(id)
  const [idx, setIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [rec, setRec] = useState(null)

  const questionMap = useMemo(() => {
    if (!interview) return {}
    const map = {}
    interview.sections.forEach(sec => {
      if (sec === 'custom') {
        customQuestions.forEach(q => { map[q.id] = { ...q, themeTitle: q.theme || 'Мои вопросы', section: 'custom' } })
        return
      }
      const level = QUESTIONS[sec]?.levels[interview.grade]
      if (!level) return
      level.themes.forEach(t => t.questions.forEach(q => { map[q.id] = { ...q, themeTitle: t.title, section: sec } }))
    })
    return map
  }, [interview, customQuestions])

  if (!interview) return <div className="p-8 text-slate-400">Интервью не найдено</div>
  if (interview.completedAt) { navigate(`/interview/${id}/result`); return null }

  const candidate = getCandidate(interview.candidateId)
  const qids = interview.questionIds
  const total = qids.length
  const answered = Object.values(interview.answers).filter(a => a.score !== null).length

  const curId = qids[idx]
  const curQ = questionMap[curId]
  const curAns = interview.answers[curId]

  const goTo = (i) => { setIdx(i); setShowAnswer(false) }

  const setScore = (score) => {
    setAnswer(id, curId, score, curAns?.note || '')
    if (idx < total - 1) setTimeout(() => { goTo(idx + 1) }, 300)
  }

  const handleFinish = () => {
    if (!rec) return
    completeInterview(id, rec)
    navigate(`/interview/${id}/result`)
  }

  const pct = Math.round((answered / total) * 100)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4 no-print">
        <button onClick={() => navigate(`/candidates/${interview.candidateId}`)} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{candidate?.name}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{LEVEL_LABELS[interview.grade]}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{answered}/{total} вопросов</span>
          </div>
          <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowFinish(true)}>Завершить</button>
      </div>

      <div className="flex flex-1">
        <div className="hidden md:block w-48 bg-white border-r p-3 overflow-auto no-print">
          <div className="space-y-1">
            {qids.map((qid, i) => {
              const a = interview.answers[qid]
              const scored = a?.score !== null && a?.score !== undefined
              const q = questionMap[qid]
              return (
                <button key={qid} onClick={() => goTo(i)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${i === idx ? 'bg-indigo-50 border border-indigo-200 text-indigo-800' : 'hover:bg-slate-50 text-slate-500'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-4 h-4 rounded-full text-center text-xs flex items-center justify-center flex-shrink-0 ${scored ? (a.score === 2 ? 'bg-green-500 text-white' : a.score === 1 ? 'bg-amber-400 text-white' : 'bg-red-400 text-white') : 'bg-slate-200'}`}>
                      {scored ? SCORE_META[a.score].short : i + 1}
                    </span>
                    <span className="truncate flex-1">{q?.q?.slice(0, 40)}...</span>
                    {a?.flagged && <span className="flex-shrink-0 text-red-400">🚩</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
          {curQ ? (
            <>
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">{curQ.themeTitle} · Вопрос {idx + 1} из {total}</div>

              <div className="card p-5 mb-4">
                <p className="text-base font-medium text-slate-800 leading-relaxed">{curQ.q}</p>

                {showAnswer ? (
                  <div className="mt-4 p-3.5 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg text-sm text-slate-700 leading-relaxed">{curQ.a}</div>
                ) : (
                  <button onClick={() => setShowAnswer(true)} className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 underline">Показать эталонный ответ</button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {SCORE_BTNS.map(btn => (
                  <button key={btn.score} onClick={() => setScore(btn.score)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${curAns?.score === btn.score ? btn.activeCls : `bg-white ${btn.cls} text-slate-700`}`}>
                    <div className="text-lg">{btn.icon}</div>
                    <div className="text-xs mt-0.5">{btn.label}</div>
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <button
                  onClick={() => toggleFlag(id, curId)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${curAns?.flagged ? 'bg-red-500 border-red-500 text-white' : 'border-red-200 text-red-400 hover:bg-red-50'}`}
                >
                  🚩 {curAns?.flagged ? 'Флаг активен — нажми чтобы снять' : 'Отметить красным флагом'}
                </button>
              </div>

              <div className="mb-4">
                <label className="label">Заметка к вопросу</label>
                <textarea
                  className="input resize-none text-sm"
                  rows={2}
                  placeholder="Что именно сказал кандидат, красные флаги..."
                  value={curAns?.note || ''}
                  onChange={e => setNote(id, curId, e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => idx > 0 && goTo(idx - 1)} disabled={idx === 0}>← Назад</button>
                <button className="btn-ghost ml-auto" onClick={() => idx < total - 1 && goTo(idx + 1)} disabled={idx === total - 1}>Вперёд →</button>
              </div>
            </>
          ) : <div className="text-slate-400">Вопрос не найден</div>}
        </div>
      </div>

      {showFinish && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Завершить интервью</h3>
            <p className="text-sm text-slate-500 mb-4">Отвечено {answered} из {total} вопросов. Выберите рекомендацию:</p>

            <div className="space-y-2 mb-4">
              {[
                { k: 'hire',   l: 'Нанять',    cls: 'border-green-300', act: 'border-green-500 bg-green-50 text-green-800' },
                { k: 'maybe',  l: 'Подумать',   cls: 'border-blue-200',  act: 'border-blue-500 bg-blue-50 text-blue-800'   },
                { k: 'reject', l: 'Отказать',   cls: 'border-red-200',   act: 'border-red-500 bg-red-50 text-red-800'      },
              ].map(opt => (
                <button key={opt.k} onClick={() => setRec(opt.k)}
                  className={`w-full py-2.5 px-4 rounded-lg border-2 text-sm font-medium text-left transition-all ${rec === opt.k ? opt.act : `${opt.cls} bg-white text-slate-700`}`}>
                  {opt.l}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="label">Общая заметка</label>
              <textarea className="input resize-none" rows={3} placeholder="Общее впечатление, сильные/слабые стороны..."
                value={interview.generalNote || ''}
                onChange={e => setGeneralNote(id, e.target.value)} />
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowFinish(false)}>Отмена</button>
              <button className="btn-primary flex-1" disabled={!rec} onClick={handleFinish}>Завершить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
