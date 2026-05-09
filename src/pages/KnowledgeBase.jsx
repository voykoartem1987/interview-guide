import { useState, useMemo } from 'react'
import { QUESTIONS, LEVEL_LABELS } from '../data/questions'

const SECTION_KEYS = Object.keys(QUESTIONS)

function QuestionRow({ q }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-50 last:border-0 py-3">
      <button className="w-full text-left flex items-start gap-3 group" onClick={() => setOpen(o => !o)}>
        <span className="flex-shrink-0 mt-0.5 text-slate-300 group-hover:text-indigo-400 transition-colors text-sm">{open ? '▾' : '▸'}</span>
        <span className="text-sm text-slate-800 font-medium leading-snug">{q.q}</span>
      </button>
      {open && (
        <div className="mt-2 ml-6 p-3 bg-indigo-50 border-l-4 border-indigo-300 rounded-r-lg text-sm text-slate-700 leading-relaxed">
          {q.a}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBase() {
  const [section, setSection] = useState(SECTION_KEYS[0])
  const [grade, setGrade] = useState('junior')
  const [search, setSearch] = useState('')

  const themes = useMemo(() => {
    const level = QUESTIONS[section]?.levels[grade]
    if (!level) return []
    if (!search.trim()) return level.themes
    const q = search.toLowerCase()
    return level.themes
      .map(t => ({ ...t, questions: t.questions.filter(x => x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q)) }))
      .filter(t => t.questions.length > 0)
  }, [section, grade, search])

  const totalQ = useMemo(() => {
    if (!search.trim()) return QUESTIONS[section]?.levels[grade]?.themes.reduce((s, t) => s + t.questions.length, 0) || 0
    return themes.reduce((s, t) => s + t.questions.length, 0)
  }, [themes, section, grade, search])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">База знаний</h1>
        <p className="text-slate-500 text-sm mt-0.5">Все вопросы с эталонными ответами</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTION_KEYS.map(k => (
          <button key={k} onClick={() => setSection(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${section === k ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
            style={section === k ? { background: QUESTIONS[k].color, borderColor: QUESTIONS[k].color } : {}}>
            {QUESTIONS[k].label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        {Object.entries(LEVEL_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setGrade(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${grade === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {v}
          </button>
        ))}
        <div className="flex-1">
          <input
            className="input h-full"
            placeholder="Поиск по вопросам и ответам..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="text-xs text-slate-400 mb-4">{totalQ} вопросов</div>

      {themes.length === 0 && (
        <div className="card p-8 text-center text-slate-400">Ничего не найдено</div>
      )}

      <div className="space-y-4">
        {themes.map(t => (
          <div key={t.id} className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-100">{t.title}</h3>
            {t.questions.map(q => <QuestionRow key={q.id} q={q} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
